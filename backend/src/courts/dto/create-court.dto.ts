import { IsString, IsEnum, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SurfaceType } from '../../entities/court.entity';

export class CreateCourtDto {
  @ApiProperty({ example: 'Central Park Tennis Courts' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: '123 Main St, Miami, FL 33101' })
  @IsString()
  @MinLength(1)
  address: string;

  @ApiProperty({ enum: SurfaceType, example: SurfaceType.HARD })
  @IsEnum(SurfaceType)
  surfaceType: SurfaceType;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ example: 25.7617, description: 'Latitude' })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -80.1918, description: 'Longitude' })
  @IsOptional()
  longitude?: number;
}

