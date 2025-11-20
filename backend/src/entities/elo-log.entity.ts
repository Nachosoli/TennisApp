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
import { Match } from './match.entity';

export enum MatchType {
  SINGLES = 'singles',
  DOUBLES = 'doubles',
}

@Entity('elo_logs')
@Index(['userId'])
@Index(['matchId'])
@Index(['matchType'])
@Index(['createdAt'])
export class ELOLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.eloLogs)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'match_id' })
  matchId: string;

  @ManyToOne(() => Match)
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({
    type: 'enum',
    enum: MatchType,
    name: 'match_type',
  })
  matchType: MatchType;

  @Column({ name: 'elo_before', type: 'decimal', precision: 7, scale: 2 })
  eloBefore: number;

  @Column({ name: 'elo_after', type: 'decimal', precision: 7, scale: 2 })
  eloAfter: number;

  @Column({ name: 'opponent_user_id', nullable: true })
  opponentUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'opponent_user_id' })
  opponent: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper methods
  get eloChange(): number {
    return Number(this.eloAfter) - Number(this.eloBefore);
  }
}

