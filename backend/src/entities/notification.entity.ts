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
import { NotificationType, NotificationChannel, NotificationStatus } from './notification.enums';

// Re-export enums for backward compatibility
export { NotificationType, NotificationChannel, NotificationStatus };

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

  // TEMPORARY: Keep old fields as optional for backward compatibility during migration
  // These will be removed after migration is complete
  @Column({
    type: 'enum',
    enum: NotificationChannel,
    nullable: true,
    select: false, // Don't select these by default
  })
  channel?: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    nullable: true,
    select: false,
  })
  status?: NotificationStatus;

  @Column({ name: 'retry_count', type: 'integer', nullable: true, select: false })
  retryCount?: number;

  @Column({ name: 'sent_at', nullable: true, select: false })
  sentAt?: Date;

  @OneToMany(() => NotificationDelivery, (delivery) => delivery.notification, { cascade: true })
  deliveries: NotificationDelivery[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

