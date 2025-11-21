import { IsEnum, IsOptional, IsDateString, IsString, IsArray, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MatchStatus, MatchFormat } from '../../entities/match.entity';
import { CreateMatchSlotDto } from './create-match.dto';

export class UpdateMatchDto {
  @ApiPropertyOptional({ enum: MatchStatus })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @ApiPropertyOptional({ example: '2025-11-24' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: MatchFormat })
  @IsOptional()
  @IsEnum(MatchFormat)
  format?: MatchFormat;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  genderFilter?: string;

  @ApiPropertyOptional({ type: [CreateMatchSlotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMatchSlotDto)
  slots?: CreateMatchSlotDto[];

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
}

