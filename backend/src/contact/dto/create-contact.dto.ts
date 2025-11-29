import { IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ContactSubject {
  SUPPORT = 'support',
  BUG = 'bug',
  FEEDBACK = 'feedback',
  FEATURE = 'feature',
  OTHER = 'other',
}

export class CreateContactDto {
  @ApiProperty({
    enum: ContactSubject,
    description: 'Subject category for the contact form',
    example: ContactSubject.SUPPORT,
  })
  @IsEnum(ContactSubject)
  subject: ContactSubject;

  @ApiProperty({
    description: 'Message content',
    example: 'I need help with...',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  message: string;
}

