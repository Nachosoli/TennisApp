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
import { WipeDatabaseDto } from './dto/wipe-database.dto';
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
  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.adminService.getAllUsers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      search,
      role,
      activeFilter,
    );
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('userId') userId: string) {
    return this.adminService.getUserById(userId);
  }

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

  @Delete('users/:userId')
  @ApiOperation({ summary: 'Delete a user' })
  async deleteUser(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: string,
  ) {
    await this.adminService.deleteUser(adminId, userId, reason);
  }

  // Court Management
  @Get('courts')
  @ApiOperation({ summary: 'Get all courts with pagination and filters' })
  async getAllCourts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllCourts(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      search,
    );
  }

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
  @Get('matches')
  @ApiOperation({ summary: 'Get all matches with pagination and filters' })
  async getAllMatches(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllMatches(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      search,
      status as any,
    );
  }

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

  // User Management - Additional Methods
  @Post('users/:userId/home-court')
  @ApiOperation({ summary: 'Set user home court' })
  async setUserHomeCourt(
    @Param('userId') userId: string,
    @Body('courtId') courtId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.setUserHomeCourt(adminId, userId, courtId);
  }

  @Get('users/:userId/matches')
  @ApiOperation({ summary: 'Get all matches for a user' })
  async getUserMatches(@Param('userId') userId: string) {
    return this.adminService.getUserMatches(userId);
  }

  @Get('users/:userId/stats')
  @ApiOperation({ summary: 'Get comprehensive user statistics' })
  async getUserStats(@Param('userId') userId: string) {
    return this.adminService.getUserStats(userId);
  }

  // TEMPORARY: Admin endpoint to run match_applicant migration
  @Post('migrations/run-match-applicant')
  @ApiOperation({ summary: 'TEMPORARY: Run migration to add match_applicant to notification enums' })
  async runMatchApplicantMigration(@CurrentUser('id') adminId: string) {
    return this.adminService.runMatchApplicantMigration(adminId);
  }

  // TEMPORARY: Admin endpoint to wipe database except courts
  @Post('wipe-database-except-courts')
  @ApiOperation({ summary: 'TEMPORARY: Wipe all database tables except courts (requires password verification)' })
  async wipeDatabaseExceptCourts(
    @CurrentUser('id') adminId: string,
    @Body() wipeDto: WipeDatabaseDto,
  ) {
    return this.adminService.wipeDatabaseExceptCourts(adminId, wipeDto);
  }
}
