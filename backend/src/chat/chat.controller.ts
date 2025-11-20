import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('matches/:matchId/messages')
  @ApiOperation({ summary: 'Get all messages for a match' })
  async getMatchMessages(
    @Param('matchId') matchId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.getMatchMessages(matchId, userId);
  }
}

