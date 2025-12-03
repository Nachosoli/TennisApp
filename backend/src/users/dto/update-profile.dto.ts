import { IsOptional, IsString, MinLength, IsEnum, IsNumber, Max, Min, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RatingType, Gender } from '../../entities/user.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'I love playing aggressive tennis!' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Miami' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'FL' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '33101' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Aggressive baseliner' })
  @IsOptional()
  @IsString()
  playStyle?: string;

  @ApiPropertyOptional({ example: 'uuid-of-court', nullable: true })
  @IsOptional()
  homeCourtId?: string | null;

  @ApiPropertyOptional({ enum: RatingType, example: RatingType.UTR })
  @IsOptional()
  @IsEnum(RatingType)
  ratingType?: RatingType;

  @ApiPropertyOptional({ example: 4.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  ratingValue?: number;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/photo.jpg' })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

