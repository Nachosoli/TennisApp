import { IsNumber, IsString, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(0.01)
  amount: number; // Amount in dollars

  @IsString()
  @IsOptional()
  currency?: string; // ISO currency code, defaults to 'usd'

  @IsUUID()
  @IsOptional()
  matchId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

