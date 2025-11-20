import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PushSubscriptionDto {
  @ApiProperty({ description: 'Push subscription endpoint URL' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ description: 'P256DH public key' })
  @IsString()
  @IsNotEmpty()
  keys: {
    p256dh: string;
    auth: string;
  };
}

