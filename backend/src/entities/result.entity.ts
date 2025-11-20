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
import { Match } from './match.entity';
import { User } from './user.entity';

@Entity('results')
@Index(['matchId'])
@Index(['player1UserId'])
@Index(['player2UserId'])
export class Result {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_id', unique: true })
  matchId: string;

  @ManyToOne(() => Match, (match) => match.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ name: 'player1_user_id', nullable: true })
  player1UserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'player1_user_id' })
  player1: User;

  @Column({ name: 'player2_user_id', nullable: true })
  player2UserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'player2_user_id' })
  player2: User;

  @Column({ name: 'guest_player1_name', nullable: true })
  guestPlayer1Name: string; // For doubles when player brings non-platform friend

  @Column({ name: 'guest_player2_name', nullable: true })
  guestPlayer2Name: string; // For doubles when player brings non-platform friend

  @Column({ type: 'text' })
  score: string; // e.g., "6-4 3-6 6-2"

  @Column({ name: 'submitted_by_user_id' })
  submittedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'submitted_by_user_id' })
  submittedBy: User;

  @Column({ default: false })
  disputed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

