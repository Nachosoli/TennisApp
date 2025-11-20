import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ActionType {
  SUSPEND_USER = 'suspend_user',
  BAN_USER = 'ban_user',
  EDIT_USER = 'edit_user',
  DELETE_COURT = 'delete_court',
  EDIT_COURT = 'edit_court',
  RESOLVE_DISPUTE = 'resolve_dispute',
  OVERRIDE_CONFIRMATION = 'override_confirmation',
  ADJUST_SCORE = 'adjust_score',
  FORCE_CANCEL_MATCH = 'force_cancel_match',
}

export enum TargetType {
  USER = 'user',
  COURT = 'court',
  MATCH = 'match',
  RESULT = 'result',
}

@Entity('admin_actions')
@Index(['adminUserId'])
@Index(['actionType'])
@Index(['targetType'])
@Index(['createdAt'])
export class AdminAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_user_id' })
  adminUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_user_id' })
  admin: User;

  @Column({
    type: 'enum',
    enum: ActionType,
    name: 'action_type',
  })
  actionType: ActionType;

  @Column({
    type: 'enum',
    enum: TargetType,
    name: 'target_type',
  })
  targetType: TargetType;

  @Column({ name: 'target_id' })
  targetId: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

