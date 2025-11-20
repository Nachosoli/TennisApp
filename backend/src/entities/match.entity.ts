import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Court } from './court.entity';
import { MatchSlot } from './match-slot.entity';
import { ChatMessage } from './chat-message.entity';
import { Result } from './result.entity';
import { SurfaceType } from './court.entity';

export enum MatchFormat {
  SINGLES = 'singles',
  DOUBLES = 'doubles',
}

export enum MatchStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('matches')
@Index(['creatorUserId'])
@Index(['courtId'])
@Index(['date'])
@Index(['status'])
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_user_id' })
  creatorUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_user_id' })
  creator: User;

  @Column({ name: 'court_id' })
  courtId: string;

  @ManyToOne(() => Court)
  @JoinColumn({ name: 'court_id' })
  court: Court;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: MatchFormat,
  })
  format: MatchFormat;

  @Column({ name: 'skill_level_min', type: 'decimal', precision: 5, scale: 2, nullable: true })
  skillLevelMin: number;

  @Column({ name: 'skill_level_max', type: 'decimal', precision: 5, scale: 2, nullable: true })
  skillLevelMax: number;

  @Column({ name: 'gender_filter', nullable: true })
  genderFilter: string;

  @Column({ name: 'max_distance', type: 'integer', nullable: true })
  maxDistance: number; // in meters

  @Column({
    type: 'enum',
    enum: SurfaceType,
    enumName: 'surface_type_enum',
    name: 'surface_filter',
    nullable: true,
  })
  surfaceFilter: SurfaceType;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.PENDING,
  })
  status: MatchStatus;

  @Column({ nullable: true, name: 'cancelled_at' })
  cancelledAt: Date;

  @Column({ nullable: true, name: 'cancelled_by_user_id' })
  cancelledByUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'cancelled_by_user_id' })
  cancelledBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => MatchSlot, (slot) => slot.match)
  slots: MatchSlot[];

  @OneToMany(() => ChatMessage, (message) => message.match)
  chatMessages: ChatMessage[];

  @OneToMany(() => Result, (result) => result.match)
  results: Result[];

  // Helper methods
  get isConfirmed(): boolean {
    return this.status === MatchStatus.CONFIRMED;
  }

  get isCancelled(): boolean {
    return this.status === MatchStatus.CANCELLED;
  }

  get isCompleted(): boolean {
    return this.status === MatchStatus.COMPLETED;
  }
}

