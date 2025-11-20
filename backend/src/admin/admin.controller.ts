import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { EditUserDto } from './dto/edit-user.dto';
import { AdjustScoreDto } from './dto/adjust-score.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  // User Management
  @Post('users/:userId/suspend')
  @ApiOperation({ summary: 'Suspend a user' })
  async suspendUser(
    @Param('userId') userId: string,
    @Body() suspendDto: SuspendUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.suspendUser(adminId, userId, suspendDto);
  }

  @Post('users/:userId/ban')
  @ApiOperation({ summary: 'Ban a user' })
  async banUser(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.banUser(adminId, userId, reason);
  }

  @Put('users/:userId')
  @ApiOperation({ summary: 'Edit user profile' })
  async editUser(
    @Param('userId') userId: string,
    @Body() editDto: EditUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.editUser(adminId, userId, editDto);
  }

  // Court Management
  @Delete('courts/:courtId')
  @ApiOperation({ summary: 'Delete a court' })
  async deleteCourt(
    @Param('courtId') courtId: string,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.deleteCourt(adminId, courtId, reason);
  }

  @Put('courts/:courtId')
  @ApiOperation({ summary: 'Edit a court' })
  async editCourt(
    @Param('courtId') courtId: string,
    @Body() updateData: Partial<any>,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.editCourt(adminId, courtId, updateData);
  }

  // Dispute Resolution
  @Patch('results/:resultId/resolve-dispute')
  @ApiOperation({ summary: 'Resolve a score dispute' })
  async resolveDispute(
    @Param('resultId') resultId: string,
    @Body('resolution') resolution: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.resolveDispute(adminId, resultId, resolution);
  }

  // Match Management
  @Post('matches/:matchId/override-confirmation')
  @ApiOperation({ summary: 'Override match confirmation' })
  async overrideConfirmation(
    @Param('matchId') matchId: string,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.overrideConfirmation(adminId, matchId, reason);
  }

  @Post('matches/:matchId/force-cancel')
  @ApiOperation({ summary: 'Force cancel a match' })
  async forceCancelMatch(
    @Param('matchId') matchId: string,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: string,
  ) {
    await this.adminService.forceCancelMatch(adminId, matchId, reason);
  }

  // Score Management
  @Patch('results/:resultId/adjust-score')
  @ApiOperation({ summary: 'Adjust a match score' })
  async adjustScore(
    @Param('resultId') resultId: string,
    @Body() adjustDto: AdjustScoreDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.adjustScore(adminId, resultId, adjustDto);
  }

  // Admin Logs
  @Get('actions')
  @ApiOperation({ summary: 'Get admin action logs' })
  async getAdminActions(@Query('limit') limit?: number) {
    return this.adminService.getAdminActions(limit);
  }
}
