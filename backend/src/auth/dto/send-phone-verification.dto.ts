import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendPhoneVerificationDto {
  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @Matches(/^\+1\d{10}$/, {
    message: 'Phone must be in US format: +1XXXXXXXXXX',
  })
  phone: string;
}

