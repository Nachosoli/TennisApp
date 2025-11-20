import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
  BANK_ACCOUNT = 'bank_account',
  OTHER = 'other',
}

@Entity('payment_methods')
@Index(['userId'])
@Index(['userId', 'isDefault'])
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.paymentMethods, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
  })
  type: PaymentMethodType;

  @Column({ length: 50 })
  provider: string; // e.g., 'stripe', 'paypal', 'manual'

  @Column({ length: 4, nullable: true })
  last4: string; // Last 4 digits for cards/accounts

  @Column({ name: 'expiry_month', type: 'int', nullable: true })
  expiryMonth: number; // For credit cards only (1-12)

  @Column({ name: 'expiry_year', type: 'int', nullable: true })
  expiryYear: number; // For credit cards only (e.g., 2025, 2026)

  @Column({ type: 'text', nullable: true })
  token: string; // Encrypted token/account number (encryption handled in service layer)

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  get isCreditCard(): boolean {
    return this.type === PaymentMethodType.CREDIT_CARD;
  }

  get isExpired(): boolean {
    if (!this.isCreditCard || !this.expiryMonth || !this.expiryYear) {
      return false;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = now.getFullYear();

    return (
      this.expiryYear < currentYear ||
      (this.expiryYear === currentYear && this.expiryMonth < currentMonth)
    );
  }

  get expiryDisplay(): string | null {
    if (!this.isCreditCard || !this.expiryMonth || !this.expiryYear) {
      return null;
    }

    const month = this.expiryMonth.toString().padStart(2, '0');
    return `${month}/${this.expiryYear}`;
  }
}

