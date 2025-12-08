import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { ApplyToSlotDto } from './dto/apply-to-slot.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply to a match slot' })
  @ApiResponse({ status: 201, description: 'Application created and slot locked' })
  @ApiResponse({ status: 400, description: 'Slot not available or time overlap' })
  @ApiResponse({ status: 403, description: 'User cannot apply' })
  async applyToSlot(
    @CurrentUser() user: User,
    @Body() applyDto: ApplyToSlotDto,
  ) {
    return this.applicationsService.applyToSlot(user.id, applyDto);
  }

  @Put(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm an application (match creator only)' })
  @ApiResponse({ status: 200, description: 'Application confirmed' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async confirmApplication(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.applicationsService.confirmApplication(user.id, id);
  }

  @Put(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an application (match creator only)' })
  @ApiResponse({ status: 200, description: 'Application rejected' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async rejectApplication(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.applicationsService.rejectApplication(user.id, id);
  }

  @Get('my-applications')
  @ApiOperation({ summary: 'Get my applications' })
  @ApiResponse({ status: 200, description: 'List of my applications' })
  async getMyApplications(@CurrentUser() user: User) {
    return this.applicationsService.getMyApplications(user.id);
  }

  @Get('match/:matchId')
  @ApiOperation({ summary: 'Get applications for a match (creator only)' })
  @ApiResponse({ status: 200, description: 'List of applications' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async getMatchApplications(
    @CurrentUser() user: User,
    @Param('matchId') matchId: string,
  ) {
    return this.applicationsService.getMatchApplications(matchId, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw from a match (applicant only)' })
  @ApiResponse({ status: 200, description: 'Application withdrawn successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async withdrawApplication(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.applicationsService.withdrawApplication(user.id, id);
  }

  @Put(':id/approve-from-waitlist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a waitlisted application (match creator only, works for both singles and doubles matches)' })
  @ApiResponse({ status: 200, description: 'Waitlisted application approved' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 400, description: 'Application is not waitlisted or match is not pending' })
  async approveFromWaitlist(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.applicationsService.approveFromWaitlist(user.id, id);
  }
}

