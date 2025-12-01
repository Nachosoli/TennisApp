import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('reviews')
@Controller('courts/:courtId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update a review for a court' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  async createReview(
    @CurrentUser('id') userId: string,
    @Param('courtId') courtId: string,
    @Body() createDto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, courtId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews for a court' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  async getReviewsByCourt(@Param('courtId') courtId: string) {
    return this.reviewsService.getReviewsByCourt(courtId);
  }

  @Get('my-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s review for a court' })
  @ApiResponse({ status: 200, description: 'User review' })
  async getUserReview(
    @CurrentUser('id') userId: string,
    @Param('courtId') courtId: string,
  ) {
    return this.reviewsService.getUserReview(userId, courtId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get average rating and review count for a court' })
  @ApiResponse({ status: 200, description: 'Court review statistics' })
  async getCourtStats(@Param('courtId') courtId: string) {
    return this.reviewsService.getCourtAverageRating(courtId);
  }

  @Delete(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 204, description: 'Review deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async deleteReview(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
  ) {
    await this.reviewsService.deleteReview(userId, reviewId);
  }
}

