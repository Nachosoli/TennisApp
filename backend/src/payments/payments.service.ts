import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { User } from '../entities/user.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Match } from '../entities/match.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured. Payment features will be disabled.');
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-11-17.clover',
      });
    }
  }

  /**
   * Create or retrieve Stripe customer for a user
   */
  async getOrCreateStripeCustomer(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If user already has a Stripe customer ID stored, return it
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId: userId,
      },
    });

    // Store Stripe customer ID in user record
    user.stripeCustomerId = customer.id;
    await this.userRepository.save(user);

    return customer.id;
  }

  /**
   * Create a payment intent for a one-time payment (e.g., match fee)
   */
  async createPaymentIntent(
    userId: string,
    amount: number, // Amount in dollars
    currency: string = 'usd',
    matchId?: string,
    description?: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get or create Stripe customer
    const customerId = await this.getOrCreateStripeCustomer(userId);

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: customerId,
      description: description || 'Match fee payment',
      metadata: {
        userId: userId,
        matchId: matchId || '',
        type: matchId ? TransactionType.MATCH_FEE : TransactionType.OTHER,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create transaction record
    const transaction = this.transactionRepository.create({
      userId,
      matchId: matchId || null,
      type: matchId ? TransactionType.MATCH_FEE : TransactionType.OTHER,
      status: TransactionStatus.PENDING,
      amount,
      currency: currency.toLowerCase(),
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customerId,
      description: description || 'Match fee payment',
    });

    await this.transactionRepository.save(transaction);

    this.logger.log(`Created payment intent ${paymentIntent.id} for user ${userId}, amount: ${amount} ${currency}`);

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Confirm payment intent (called after frontend confirms payment)
   */
  async confirmPayment(paymentIntentId: string): Promise<Transaction> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const transaction = await this.transactionRepository.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      transaction.status = TransactionStatus.COMPLETED;
      transaction.stripeChargeId = paymentIntent.latest_charge as string;
      await this.transactionRepository.save(transaction);

      this.logger.log(`Payment confirmed: ${paymentIntentId}`);
    } else if (paymentIntent.status === 'canceled') {
      transaction.status = TransactionStatus.CANCELLED;
      await this.transactionRepository.save(transaction);
    } else if (paymentIntent.status === 'requires_payment_method') {
      // Payment failed - requires new payment method
      transaction.status = TransactionStatus.FAILED;
      await this.transactionRepository.save(transaction);
    }

    return transaction;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        this.logger.debug(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      transaction.status = TransactionStatus.COMPLETED;
      transaction.stripeChargeId = paymentIntent.latest_charge as string;
      await this.transactionRepository.save(transaction);
      this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      transaction.status = TransactionStatus.FAILED;
      await this.transactionRepository.save(transaction);
      this.logger.warn(`Payment failed: ${paymentIntent.id}`);
    }
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (transaction) {
      transaction.status = TransactionStatus.CANCELLED;
      await this.transactionRepository.save(transaction);
      this.logger.log(`Payment canceled: ${paymentIntent.id}`);
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { stripeChargeId: charge.id },
    });

    if (transaction) {
      transaction.status = TransactionStatus.REFUNDED;
      await this.transactionRepository.save(transaction);
      this.logger.log(`Charge refunded: ${charge.id}`);
    }
  }

  /**
   * Get user's payment history
   */
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['match'],
    });
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string, userId?: string): Promise<Transaction> {
    const where: any = { id: transactionId };
    if (userId) {
      where.userId = userId;
    }

    const transaction = await this.transactionRepository.findOne({
      where,
      relations: ['match', 'user'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Create a refund for a transaction
   */
  async createRefund(transactionId: string, amount?: number): Promise<Transaction> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (!transaction.stripeChargeId) {
      throw new BadRequestException('Transaction does not have a charge ID');
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed transactions');
    }

    // Create refund in Stripe
    const refundAmount = amount ? Math.round(amount * 100) : undefined;
    const refund = await this.stripe.refunds.create({
      charge: transaction.stripeChargeId,
      amount: refundAmount,
    });

    // Update transaction status
    transaction.status = TransactionStatus.REFUNDED;
    await this.transactionRepository.save(transaction);

    // Create refund transaction record
    const refundTransaction = this.transactionRepository.create({
      userId: transaction.userId,
      matchId: transaction.matchId,
      type: TransactionType.REFUND,
      status: TransactionStatus.COMPLETED,
      amount: refundAmount ? refundAmount / 100 : transaction.amount,
      currency: transaction.currency,
      stripeChargeId: refund.id,
      description: `Refund for transaction ${transactionId}`,
      metadata: {
        originalTransactionId: transactionId,
      },
    });

    await this.transactionRepository.save(refundTransaction);

    this.logger.log(`Refund created: ${refund.id} for transaction ${transactionId}`);

    return refundTransaction;
  }
}

