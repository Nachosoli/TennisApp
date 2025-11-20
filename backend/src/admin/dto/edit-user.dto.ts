import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RatingType } from '../../entities/user.entity';

export class EditUserDto {
  @ApiProperty({ description: 'First name', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: 'Last name', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: 'Email', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Rating type', required: false })
  @IsOptional()
  @IsEnum(RatingType)
  ratingType?: RatingType;

  @ApiProperty({ description: 'Rating value', required: false })
  @IsOptional()
  @IsNumber()
  ratingValue?: number;

  @ApiProperty({ description: 'Home court ID', required: false })
  @IsOptional()
  @IsString()
  homeCourtId?: string;

  @ApiProperty({ description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
