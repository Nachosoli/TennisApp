import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsService } from './payments.service';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../entities/user.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Match } from '../entities/match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, User, PaymentMethod, Match])],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

