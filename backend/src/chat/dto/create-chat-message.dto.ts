import { IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatMessageDto {
  @ApiProperty({ description: 'Match ID' })
  @IsUUID()
  @IsNotEmpty()
  matchId: string;

  @ApiProperty({ description: 'Message content', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;
}

