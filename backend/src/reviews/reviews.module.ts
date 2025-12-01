import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { CourtReview } from '../entities/court-review.entity';
import { Court } from '../entities/court.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourtReview, Court])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}

