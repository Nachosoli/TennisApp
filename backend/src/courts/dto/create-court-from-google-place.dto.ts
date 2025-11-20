import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourtFromGooglePlaceDto {
  @ApiProperty({ example: 'Central Park Tennis Courts' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123 Main St, New York, NY 10001' })
  @IsString()
  address: string;

  @ApiProperty({ example: 40.7128 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -74.006 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 'ChIJOwg_06VPwokRYv534QaPC8g' })
  @IsOptional()
  @IsString()
  placeId?: string;
}





