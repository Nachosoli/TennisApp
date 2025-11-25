import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Court } from './court.entity';
import { Match } from './match.entity';
import { Application } from './application.entity';
import { ChatMessage } from './chat-message.entity';
import { Result } from './result.entity';
import { ELOLog } from './elo-log.entity';
import { UserStats } from './user-stats.entity';
import { Notification } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';
import { Report } from './report.entity';
import { AdminAction } from './admin-action.entity';
import { PaymentMethod } from './payment-method.entity';

export enum RatingType {
  UTR = 'utr',
  USTA = 'usta',
  ULTIMATE = 'ultimate',
  CUSTOM = 'custom',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum SubscriptionStatus {
  FREE = 'free',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string | null;

  @Column({ nullable: true })
  provider: string; // 'google', 'facebook', etc. or null for email/password

  @Column({ name: 'provider_id', nullable: true })
  providerId: string; // OAuth provider's user ID

  @Column({ nullable: true })
  phone: string;

  @Column({ default: false, name: 'phone_verified' })
  phoneVerified: boolean;

  @Column({ default: false, name: 'email_verified' })
  emailVerified: boolean;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'photo_url', nullable: true })
  photoUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ name: 'play_style', nullable: true })
  playStyle: string;

  @Column({
    type: 'enum',
    enum: RatingType,
    name: 'rating_type',
    nullable: true,
  })
  ratingType: RatingType;

  @Column({ name: 'rating_value', type: 'decimal', precision: 5, scale: 2, nullable: true })
  ratingValue: number;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Column({ name: 'home_court_id', nullable: true })
  homeCourtId: string;

  @ManyToOne(() => Court, { nullable: true })
  @JoinColumn({ name: 'home_court_id' })
  homeCourt: Court;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ nullable: true, name: 'suspended_until' })
  suspendedUntil: Date;

  @Column({ nullable: true, name: 'banned_at' })
  bannedAt: Date;

  @Column({ name: 'is_paid', default: true })
  isPaid: boolean; // App is free for now, so default to true

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    name: 'subscription_status',
    default: SubscriptionStatus.FREE,
  })
  subscriptionStatus: SubscriptionStatus;

  @Column({ name: 'subscription_expires_at', nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ name: 'payment_required', default: false })
  paymentRequired: boolean; // System-wide flag for payment requirement

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Match, (match) => match.creator)
  createdMatches: Match[];

  @OneToMany(() => Application, (application) => application.applicant)
  applications: Application[];

  @OneToMany(() => ChatMessage, (message) => message.user)
  chatMessages: ChatMessage[];

  @OneToMany(() => Result, (result) => result.player1)
  resultsAsPlayer1: Result[];

  @OneToMany(() => Result, (result) => result.player2)
  resultsAsPlayer2: Result[];

  @OneToMany(() => ELOLog, (log) => log.user)
  eloLogs: ELOLog[];

  @OneToOne(() => UserStats, (stats) => stats.user)
  stats: UserStats;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => NotificationPreference, (pref) => pref.user)
  notificationPreferences: NotificationPreference[];

  @OneToMany(() => Report, (report) => report.reporter)
  reportsMade: Report[];

  @OneToMany(() => AdminAction, (action) => action.admin)
  adminActions: AdminAction[];

  @OneToMany(() => PaymentMethod, (paymentMethod) => paymentMethod.user)
  paymentMethods: PaymentMethod[];

  // Helper methods
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  get isBanned(): boolean {
    return this.bannedAt !== null;
  }

  get isSuspended(): boolean {
    return this.suspendedUntil !== null && this.suspendedUntil > new Date();
  }

  get canCreateMatches(): boolean {
    return this.homeCourtId !== null && this.phoneVerified && !this.isBanned && !this.isSuspended;
  }

  get hasActiveSubscription(): boolean {
    return (
      this.subscriptionStatus === SubscriptionStatus.ACTIVE &&
      (!this.subscriptionExpiresAt || this.subscriptionExpiresAt > new Date())
    );
  }

  get isSubscriptionExpired(): boolean {
    return (
      this.subscriptionStatus === SubscriptionStatus.EXPIRED ||
      (this.subscriptionExpiresAt !== null && this.subscriptionExpiresAt <= new Date())
    );
  }

  get defaultPaymentMethod(): PaymentMethod | undefined {
    return this.paymentMethods?.find((pm) => pm.isDefault && pm.isActive);
  }
}

