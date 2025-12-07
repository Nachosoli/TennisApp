import { IsEnum, IsOptional, IsDateString, IsString, IsNumber, IsArray, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MatchStatus, MatchFormat } from '../../entities/match.entity';
import { SurfaceType } from '../../entities/court.entity';
import { CreateMatchSlotDto } from './create-match.dto';

export class UpdateMatchDto {
  @ApiPropertyOptional({ enum: MatchStatus })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @ApiPropertyOptional({ example: 'court-uuid-here' })
  @IsOptional()
  @IsString()
  courtId?: string;

  @ApiPropertyOptional({ example: '2024-12-25' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: MatchFormat })
  @IsOptional()
  @IsEnum(MatchFormat)
  format?: MatchFormat;

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
