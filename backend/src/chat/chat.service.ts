import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';
import { Match } from '../entities/match.entity';
import { Application } from '../entities/application.entity';
import { User } from '../entities/user.entity';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.enums';
import { sanitizeTextContent } from '../common/utils/sanitize.util';

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

    // Sanitize message content to prevent XSS
    const sanitizedMessage = sanitizeTextContent(createDto.message);

    const message = this.chatMessageRepository.create({
      matchId: createDto.matchId,
      userId,
      message: sanitizedMessage,
    });

    const savedMessage = await this.chatMessageRepository.save(message);
    
    // Get match participants and notify them (except sender)
    const matchWithRelations = await this.matchRepository.findOne({
      where: { id: createDto.matchId },
      relations: ['creator', 'court', 'slots', 'slots.applications', 'slots.applications.applicant'],
    });

    if (matchWithRelations) {
      const participants: string[] = [];
      
      // Add creator
      if (matchWithRelations.creatorUserId && matchWithRelations.creatorUserId !== userId) {
        participants.push(matchWithRelations.creatorUserId);
      }

      // Add applicants (handle multiple applications per slot)
      if (matchWithRelations.slots) {
        matchWithRelations.slots.forEach((slot) => {
          if (slot.applications && slot.applications.length > 0) {
            slot.applications.forEach((application) => {
              if (application.applicantUserId && application.applicantUserId !== userId) {
                if (!participants.includes(application.applicantUserId)) {
                  participants.push(application.applicantUserId);
                }
              }
            });
          }
        });
      }

      // Send notifications to all participants
      const sender = await this.userRepository.findOne({ where: { id: userId } });
      const senderName = sender && sender.firstName && sender.lastName 
        ? `${sender.firstName} ${sender.lastName}` 
        : 'Someone';

      for (const participantId of participants) {
        await this.notificationsService.createNotification(
          participantId,
          NotificationType.NEW_CHAT,
          `New message from ${senderName}`,
          {
            senderName,
            courtName: matchWithRelations.court?.name || 'Court',
            date: matchWithRelations.date 
              ? (matchWithRelations.date instanceof Date 
                  ? matchWithRelations.date.toLocaleDateString()
                  : new Date(matchWithRelations.date).toLocaleDateString())
              : 'Unknown date',
            messagePreview: createDto.message.substring(0, 50),
            matchId: matchWithRelations.id,
          },
        );
      }
    }
    
    // Load the message with user relation for frontend display
    const messageWithUser = await this.chatMessageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['user'],
    });
    
    return messageWithUser || savedMessage;
  }

  async verifyMatchAccess(userId: string, matchId: string): Promise<boolean> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['slots', 'slots.applications'],
    });

    if (!match) {
      return false;
    }

    // Creator always has access
    if (match.creatorUserId === userId) {
      return true;
    }

    // Check if user has a confirmed application for any slot in this match
    // For confirmed matches, only confirmed applicants should have access
    const hasConfirmedApplication = match.slots.some(
      (slot) => slot.applications?.some(
        (app) => app.applicantUserId === userId && app.status === 'confirmed'
      ),
    );

    return hasConfirmedApplication;
  }

  async getMatchMessages(matchId: string, userId: string): Promise<ChatMessage[]> {
    // Verify access first
    const hasAccess = await this.verifyMatchAccess(userId, matchId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this match chat');
    }

    // Get all messages
    const allMessages = await this.chatMessageRepository.find({
      where: { matchId },
      relations: ['user'],
      order: { createdAt: 'ASC' }, // Oldest first for chat UI (older on top, newer on bottom)
    });

    // Get when user joined the match (for privacy: new opponents shouldn't see old messages)
    const userJoinTime = await this.getUserJoinTime(matchId, userId);
    
    if (!userJoinTime) {
      // User not confirmed, return empty (shouldn't happen due to access check, but safety)
      return [];
    }

    // Filter messages: only show messages created after user joined
    // This ensures new opponents don't see previous chat history
    return allMessages.filter(msg => new Date(msg.createdAt) >= userJoinTime);
  }

  /**
   * Get the timestamp when a user joined a match
   * For creator: returns match creation time
   * For applicant: returns when their application was confirmed
   */
  private async getUserJoinTime(matchId: string, userId: string): Promise<Date | null> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['slots', 'slots.applications'],
    });

    if (!match) {
      return null;
    }

    // Creator: joined when match was created
    if (match.creatorUserId === userId) {
      return match.createdAt;
    }

    // Applicant: joined when their application was confirmed
    // Find the confirmed application for this user
    for (const slot of match.slots || []) {
      if (slot.applications) {
        const confirmedApp = slot.applications.find(
          app => app.applicantUserId === userId && app.status === 'confirmed'
        );
        if (confirmedApp) {
          // Use slot's confirmedAt if available, otherwise use application creation time
          // Note: confirmedAt is set when application is confirmed
          if (slot.confirmedAt) {
            return slot.confirmedAt;
          }
          // Fallback to application creation time (shouldn't happen, but safety)
          return confirmedApp.createdAt;
        }
      }
    }

    // User not found as confirmed participant
    return null;
  }

  /**
   * Create an automatic match confirmation message when a match is confirmed
   * @param matchId The match ID
   * @param senderUserId The user ID who is sending the message (sender)
   * @param recipientUserId The user ID who will receive the message (recipient)
   * @param match The match entity with relations (court, slots, etc.)
   * @param confirmedSlot The confirmed match slot
   * @returns The created message
   */
  async createContactInfoMessage(
    matchId: string,
    senderUserId: string,
    recipientUserId: string,
    match: any,
    confirmedSlot: any,
  ): Promise<ChatMessage | null> {
    // Get the sender user
    const sender = await this.userRepository.findOne({
      where: { id: senderUserId },
    });

    if (!sender) {
      throw new NotFoundException('Sender user not found');
    }

    // Format the match date
    const matchDate = match.date instanceof Date ? match.date : new Date(match.date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[matchDate.getDay()];
    const month = matchDate.getMonth() + 1; // 1-12
    const day = matchDate.getDate();
    const datePrefix = `${dayName} ${month}/${day}`;

    // Format full date for message body
    const fullDate = matchDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Format time slot
    const formatTime = (timeString: string): string => {
      if (!timeString) return '';
      // Convert HH:MM:SS or HH:MM to 12-hour format
      const [hours, minutes] = timeString.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const timeSlot = `${formatTime(confirmedSlot.startTime)} - ${formatTime(confirmedSlot.endTime)}`;
    const courtName = match.court?.name || 'Court';

    // Build message: "Sender's Name (Wednesday 9/24): Your match is scheduled! Date at Time Slot at Court"
    const senderName = `${sender.firstName} ${sender.lastName}`;
    const messageText = `${senderName} (${datePrefix}): Your match is scheduled! ${fullDate} at ${timeSlot} at ${courtName}`;

    // Create the message
    const message = this.chatMessageRepository.create({
      matchId,
      userId: senderUserId, // The sender of the message
      message: messageText,
    });

    const savedMessage = await this.chatMessageRepository.save(message);

    return savedMessage;
  }
}

