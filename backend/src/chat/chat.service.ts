import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';
import { Match } from '../entities/match.entity';
import { Application } from '../entities/application.entity';
import { User } from '../entities/user.entity';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async createMessage(userId: string, createDto: CreateChatMessageDto): Promise<ChatMessage> {
    // Verify match exists
    const match = await this.matchRepository.findOne({
      where: { id: createDto.matchId },
      relations: ['creator'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Verify user has access (creator or applicant)
    const hasAccess = await this.verifyMatchAccess(userId, createDto.matchId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this match chat');
    }

    const message = this.chatMessageRepository.create({
      matchId: createDto.matchId,
      userId,
      message: createDto.message,
    });

    const savedMessage = await this.chatMessageRepository.save(message);

    // Get match participants and notify them (except sender)
    const matchWithRelations = await this.matchRepository.findOne({
      where: { id: createDto.matchId },
      relations: ['creator', 'court', 'slots', 'slots.application', 'slots.application.applicant'],
    });

    if (matchWithRelations) {
      const participants: string[] = [];
      
      // Add creator
      if (matchWithRelations.creatorUserId && matchWithRelations.creatorUserId !== userId) {
        participants.push(matchWithRelations.creatorUserId);
      }

      // Add applicants
      matchWithRelations.slots.forEach((slot) => {
        if (slot.application?.applicantUserId && slot.application.applicantUserId !== userId) {
          if (!participants.includes(slot.application.applicantUserId)) {
            participants.push(slot.application.applicantUserId);
          }
        }
      });

      // Send notifications to all participants
      const sender = await this.userRepository.findOne({ where: { id: userId } });
      const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Someone';

      for (const participantId of participants) {
        await this.notificationsService.createNotification(
          participantId,
          NotificationType.NEW_CHAT,
          `New message from ${senderName}`,
          {
            senderName,
            courtName: matchWithRelations.court?.name || 'Court',
            date: matchWithRelations.date,
            messagePreview: createDto.message.substring(0, 50),
            matchId: matchWithRelations.id,
          },
        );
      }
    }

    return savedMessage;
  }

  async verifyMatchAccess(userId: string, matchId: string): Promise<boolean> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['slots', 'slots.application'],
    });

    if (!match) {
      return false;
    }

    // Creator always has access
    if (match.creatorUserId === userId) {
      return true;
    }

    // Check if user has an application for any slot in this match
    const hasApplication = match.slots.some(
      (slot) => slot.application?.applicantUserId === userId,
    );

    return hasApplication;
  }

  async getMatchMessages(matchId: string, userId: string): Promise<ChatMessage[]> {
    // Verify access first
    const hasAccess = await this.verifyMatchAccess(userId, matchId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this match chat');
    }

    return this.chatMessageRepository.find({
      where: { matchId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }
}

