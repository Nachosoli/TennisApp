import { IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPhoneDto {
  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @Matches(/^\+1\d{10}$/, {
    message: 'Phone must be in US format: +1XXXXXXXXXX',
  })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}

