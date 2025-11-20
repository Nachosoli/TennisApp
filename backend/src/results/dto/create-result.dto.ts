import { IsString, IsUUID, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResultDto {
  @ApiProperty({ description: 'Match ID' })
  @IsUUID()
  @IsNotEmpty()
  matchId: string;

  @ApiProperty({ description: 'Score in format "6-4 3-6 6-2"', example: '6-4 3-6 6-2' })
  @IsString()
  @IsNotEmpty()
  score: string;

  @ApiProperty({ description: 'Guest player 1 name (for doubles)', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  guestPlayer1Name?: string;
}

