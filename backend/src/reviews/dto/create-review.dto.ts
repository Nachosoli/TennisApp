import { IsInt, IsString, IsNotEmpty, Min, Max, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Rating from 1 to 5 stars', minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Review comment', maxLength: 2000, example: 'Great court with excellent facilities!' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;
}

