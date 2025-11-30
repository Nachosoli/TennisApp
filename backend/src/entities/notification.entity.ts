// IMPORTANT: Import enums FIRST before any entity imports to avoid circular dependency issues
import { NotificationType, NotificationChannel, NotificationStatus } from './notification.enums';

// Re-export enums for backward compatibility
export { NotificationType, NotificationChannel, NotificationStatus };

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

