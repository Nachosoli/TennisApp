import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportType, ReportStatus } from '../entities/report.entity';
import { User } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import { Court } from '../entities/court.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
  ) {}

  /**
   * Create a report
   */
  async createReport(
    reporterId: string,
    reportType: ReportType,
    targetId: string,
    reason: string,
  ): Promise<Report> {
    // Verify target exists
    await this.verifyTargetExists(reportType, targetId);

    // Check if user already reported this target
    const existingReport = await this.reportRepository.findOne({
      where: {
        reporterUserId: reporterId,
        reportType,
        targetId,
        status: ReportStatus.PENDING,
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this item');
    }

    const report = this.reportRepository.create({
      reporterUserId: reporterId,
      reportType,
      targetId,
      reason,
      status: ReportStatus.PENDING,
    });

    return this.reportRepository.save(report);
  }

  /**
   * Get all reports (admin only)
   */
  async getAllReports(status?: ReportStatus): Promise<Report[]> {
    const query = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.admin', 'admin')
      .orderBy('report.createdAt', 'DESC');

    if (status) {
      query.where('report.status = :status', { status });
    }

    return query.getMany();
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId: string): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['reporter', 'admin'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  /**
   * Update report status (admin only)
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    adminId: string,
  ): Promise<Report> {
    const report = await this.getReportById(reportId);

    report.status = status;
    report.adminUserId = adminId;
    if (status === ReportStatus.RESOLVED || status === ReportStatus.DISMISSED) {
      report.resolvedAt = new Date();
    }

    return this.reportRepository.save(report);
  }

  /**
   * Get user's reports
   */
  async getUserReports(userId: string): Promise<Report[]> {
    return this.reportRepository.find({
      where: { reporterUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Verify target exists
   */
  private async verifyTargetExists(reportType: ReportType, targetId: string): Promise<void> {
    switch (reportType) {
      case ReportType.USER:
        const user = await this.userRepository.findOne({ where: { id: targetId } });
        if (!user) {
          throw new NotFoundException('User not found');
        }
        break;
      case ReportType.MATCH:
        const match = await this.matchRepository.findOne({ where: { id: targetId } });
        if (!match) {
          throw new NotFoundException('Match not found');
        }
        break;
      case ReportType.COURT:
        const court = await this.courtRepository.findOne({ where: { id: targetId } });
        if (!court) {
          throw new NotFoundException('Court not found');
        }
        break;
    }
  }
}

