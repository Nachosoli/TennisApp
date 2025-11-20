import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportStatus } from '../entities/report.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a report' })
  async createReport(
    @Body() createDto: CreateReportDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reportsService.createReport(
      userId,
      createDto.reportType,
      createDto.targetId,
      createDto.reason,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user reports' })
  async getUserReports(@CurrentUser('id') userId: string) {
    return this.reportsService.getUserReports(userId);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get all reports (admin only)' })
  async getAllReports(@Query('status') status?: ReportStatus) {
    return this.reportsService.getAllReports(status);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get report by ID (admin only)' })
  async getReport(@Param('id') id: string) {
    return this.reportsService.getReportById(id);
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update report status (admin only)' })
  async updateReportStatus(
    @Param('id') id: string,
    @Body('status') status: ReportStatus,
    @CurrentUser('id') adminId: string,
  ) {
    return this.reportsService.updateReportStatus(id, status, adminId);
  }
}

