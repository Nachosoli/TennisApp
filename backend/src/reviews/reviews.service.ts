import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourtReview } from '../entities/court-review.entity';
import { Court } from '../entities/court.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { sanitizeInput } from '../common/utils/sanitize.util';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(CourtReview)
    private reviewRepository: Repository<CourtReview>,
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
  ) {}

  async createReview(userId: string, courtId: string, createDto: CreateReviewDto): Promise<CourtReview> {
    // Check if court exists
    const court = await this.courtRepository.findOne({ where: { id: courtId } });
    if (!court) {
      throw new NotFoundException('Court not found');
    }

    // Check if user already reviewed this court
    const existingReview = await this.reviewRepository.findOne({
      where: { courtId, userId },
    });

    if (existingReview) {
      // Update existing review
      existingReview.rating = createDto.rating;
      existingReview.comment = createDto.comment ? sanitizeInput(createDto.comment) : null;
      return this.reviewRepository.save(existingReview);
    }

    // Create new review
    const review = this.reviewRepository.create({
      courtId,
      userId,
      rating: createDto.rating,
      comment: createDto.comment ? sanitizeInput(createDto.comment) : null,
    });

    return this.reviewRepository.save(review);
  }

  async getReviewsByCourt(courtId: string): Promise<CourtReview[]> {
    return this.reviewRepository.find({
      where: { courtId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getUserReview(userId: string, courtId: string): Promise<CourtReview | null> {
    return this.reviewRepository.findOne({
      where: { courtId, userId },
      relations: ['user'],
    });
  }

  async deleteReview(userId: string, reviewId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['user'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewRepository.remove(review);
  }

  async getCourtAverageRating(courtId: string): Promise<{ average: number; count: number }> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.courtId = :courtId', { courtId })
      .getRawOne();

    return {
      average: result?.average ? parseFloat(result.average) : 0,
      count: parseInt(result?.count || '0', 10),
    };
  }
}

