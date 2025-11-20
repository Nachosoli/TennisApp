import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_stats')
@Index(['userId'], { unique: true })
export class UserStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.stats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'singles_elo', type: 'decimal', precision: 7, scale: 2, default: 1500 })
  singlesElo: number;

  @Column({ name: 'doubles_elo', type: 'decimal', precision: 7, scale: 2, default: 1500 })
  doublesElo: number;

  @Column({ name: 'win_streak_singles', type: 'integer', default: 0 })
  winStreakSingles: number;

  @Column({ name: 'win_streak_doubles', type: 'integer', default: 0 })
  winStreakDoubles: number;

  @Column({ name: 'total_matches', type: 'integer', default: 0 })
  totalMatches: number;

  @Column({ name: 'total_wins', type: 'integer', default: 0 })
  totalWins: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  get winRate(): number {
    return this.totalMatches > 0 ? (this.totalWins / this.totalMatches) * 100 : 0;
  }
}

