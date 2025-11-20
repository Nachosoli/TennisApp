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
import { User } from './user.entity';

export enum ReportType {
  USER = 'user',
  MATCH = 'match',
  COURT = 'court',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

@Entity('reports')
@Index(['reporterUserId'])
@Index(['reportType'])
@Index(['status'])
@Index(['createdAt'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_user_id' })
  reporterUserId: string;

  @ManyToOne(() => User, (user) => user.reportsMade)
  @JoinColumn({ name: 'reporter_user_id' })
  reporter: User;

  @Column({
    type: 'enum',
    enum: ReportType,
    name: 'report_type',
  })
  reportType: ReportType;

  @Column({ name: 'target_id' })
  targetId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ name: 'admin_user_id', nullable: true })
  adminUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'admin_user_id' })
  admin: User;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

