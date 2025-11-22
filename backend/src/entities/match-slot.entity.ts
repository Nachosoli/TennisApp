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
import { Match } from './match.entity';
import { User } from './user.entity';
import { Application } from './application.entity';

export enum SlotStatus {
  AVAILABLE = 'available',
  LOCKED = 'locked',
  CONFIRMED = 'confirmed',
}

@Entity('match_slots')
@Index(['matchId'])
@Index(['status'])
@Index(['lockedByUserId'])
export class MatchSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_id' })
  matchId: string;

  @ManyToOne(() => Match, (match) => match.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({
    type: 'enum',
    enum: SlotStatus,
    default: SlotStatus.AVAILABLE,
  })
  status: SlotStatus;

  @Column({ name: 'locked_by_user_id', nullable: true })
  lockedByUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'locked_by_user_id' })
  lockedBy: User;

  @Column({ name: 'locked_at', nullable: true })
  lockedAt: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  @Column({ name: 'confirmed_at', nullable: true })
  confirmedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToMany(() => Application, (application) => application.matchSlot)
  applications: Application[];

  // Helper methods
  get isAvailable(): boolean {
    return this.status === SlotStatus.AVAILABLE;
  }

  get isLocked(): boolean {
    return this.status === SlotStatus.LOCKED;
  }

  get isConfirmed(): boolean {
    return this.status === SlotStatus.CONFIRMED;
  }

  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt < new Date();
  }
}

