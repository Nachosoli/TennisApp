import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyToSlotDto {
  @ApiProperty({ example: 'match-slot-uuid-here' })
  @IsString()
  matchSlotId: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Guest partner name for doubles' })
  @IsOptional()
  @IsString()
  guestPartnerName?: string;
}

