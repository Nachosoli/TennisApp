import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent for a one-time payment' })
  async createPaymentIntent(
    @Request() req: any,
    @Body() createDto: CreatePaymentIntentDto,
  ) {
    const userId = req.user.id;
    return this.paymentsService.createPaymentIntent(
      userId,
      createDto.amount,
      createDto.currency,
      createDto.matchId,
      createDto.description,
    );
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a payment intent' })
  @HttpCode(HttpStatus.OK)
  async confirmPayment(@Request() req: any, @Body() confirmDto: ConfirmPaymentDto) {
    const userId = req.user.id;
    const transaction = await this.paymentsService.confirmPayment(confirmDto.paymentIntentId);
    
    // Verify the transaction belongs to the user
    if (transaction.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return transaction;
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user payment history' })
  async getUserTransactions(@Request() req: any) {
    const userId = req.user.id;
    return this.paymentsService.getUserTransactions(userId);
  }

  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific transaction' })
  async getTransaction(@Request() req: any, @Param('id') transactionId: string) {
    const userId = req.user.id;
    return this.paymentsService.getTransaction(transactionId, userId);
  }

  @Post('transactions/:id/refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a refund for a transaction' })
  async createRefund(
    @Request() req: any,
    @Param('id') transactionId: string,
    @Body() body: { amount?: number },
  ) {
    const userId = req.user.id;
    
    // Verify transaction belongs to user (or user is admin)
    const transaction = await this.paymentsService.getTransaction(transactionId);
    if (transaction.userId !== userId && req.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    return this.paymentsService.createRefund(transactionId, body.amount);
  }
}

