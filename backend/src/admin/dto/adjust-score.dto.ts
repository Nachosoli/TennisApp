import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustScoreDto {
  @ApiProperty({ description: 'New score in format "6-4 3-6 6-2"' })
  @IsString()
  @IsNotEmpty()
  score: string;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

