import { IsEnum, IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType } from '../../entities/report.entity';

export class CreateReportDto {
  @ApiProperty({ description: 'Type of report', enum: ReportType })
  @IsEnum(ReportType)
  @IsNotEmpty()
  reportType: ReportType;

  @ApiProperty({ description: 'ID of the target being reported' })
  @IsUUID()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({ description: 'Reason for the report' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

