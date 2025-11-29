import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { NotificationDelivery } from './notification-delivery.entity';

export enum NotificationType {
  MATCH_CREATED = 'match_created',
  MATCH_ACCEPTED = 'match_accepted',
  MATCH_APPLICANT = 'match_applicant',
  MATCH_CONFIRMED = 'match_confirmed',
  COURT_CHANGES = 'court_changes',
  SCORE_REMINDER = 'score_reminder',
  NEW_CHAT = 'new_chat',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('notifications')
@Index(['userId'])
@Index(['type'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'text' })
  content: string;

  @OneToMany(() => NotificationDelivery, (delivery) => delivery.notification, { cascade: true })
  deliveries: NotificationDelivery[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

