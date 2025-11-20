import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MatchSlot } from './match-slot.entity';
import { User } from './user.entity';

export enum ApplicationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('applications')
@Index(['matchSlotId'])
@Index(['applicantUserId'])
@Index(['status'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_slot_id', unique: true })
  matchSlotId: string;

  @OneToOne(() => MatchSlot, (slot) => slot.application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_slot_id' })
  matchSlot: MatchSlot;

  @Column({ name: 'applicant_user_id' })
  applicantUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'applicant_user_id' })
  applicant: User;

  @Column({ name: 'guest_partner_name', nullable: true })
  guestPartnerName: string; // For doubles matches when bringing a non-platform friend

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper methods
  get isPending(): boolean {
    return this.status === ApplicationStatus.PENDING;
  }

  get isConfirmed(): boolean {
    return this.status === ApplicationStatus.CONFIRMED;
  }

  get isRejected(): boolean {
    return this.status === ApplicationStatus.REJECTED;
  }
}

