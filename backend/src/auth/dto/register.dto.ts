import { IsEmail, IsString, MinLength, IsOptional, Matches, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @Transform(({ value }) => {
    // Auto-format US phone numbers
    if (!value) return value;
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // If it's 10 digits, prepend +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    // If it's 11 digits and starts with 1, prepend +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    // If it already starts with +1, return as is
    if (value.startsWith('+1') && digits.length === 11) {
      return value;
    }
    // Otherwise return original value (validation will catch invalid formats)
    return value;
  })
  @Matches(/^\+1\d{10}$/, {
    message: 'Phone must be a valid US phone number (10 digits)',
  })
  phone: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  lastName: string;
}

