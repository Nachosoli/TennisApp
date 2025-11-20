import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchFormat, MatchStatus } from '../../entities/match.entity';
import { SurfaceType } from '../../entities/court.entity';

export class CreateMatchSlotDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '10:30' })
  @IsString()
  endTime: string;
}

export class CreateMatchDto {
  @ApiProperty({ example: 'court-uuid-here' })
  @IsString()
  courtId: string;

  @ApiProperty({ example: '2024-12-25' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: MatchFormat, example: MatchFormat.SINGLES })
  @IsEnum(MatchFormat)
  format: MatchFormat;

  @ApiProperty({ type: [CreateMatchSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMatchSlotDto)
  slots: CreateMatchSlotDto[];

  @ApiPropertyOptional({ example: 3.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  skillLevelMin?: number;

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  skillLevelMax?: number;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  genderFilter?: string;

  @ApiPropertyOptional({ example: 20, description: 'Max distance in miles' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistance?: number;

  @ApiPropertyOptional({ enum: SurfaceType })
  @IsOptional()
  @IsEnum(SurfaceType)
  surfaceFilter?: SurfaceType;
}

