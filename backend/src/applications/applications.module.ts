import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application } from '../entities/application.entity';
import { MatchSlot } from '../entities/match-slot.entity';
import { Match } from '../entities/match.entity';
import { User } from '../entities/user.entity';
import { UserStats } from '../entities/user-stats.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { ChatModule } from '../chat/chat.module';
import { MatchesModule } from '../matches/matches.module';
import { ChatGateway } from '../chat/chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, MatchSlot, Match, User, UserStats]),
    NotificationsModule,
    GatewaysModule,
    ChatModule, // Import ChatModule to use ChatService
    MatchesModule, // Import MatchesModule to use MatchesService for cache clearing
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

