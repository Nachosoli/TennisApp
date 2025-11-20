import { IsDate, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SuspendUserDto {
  @ApiProperty({ description: 'Suspension end date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  suspendedUntil?: Date;

  @ApiProperty({ description: 'Reason for suspension' })
  @IsString()
  reason: string;
}
