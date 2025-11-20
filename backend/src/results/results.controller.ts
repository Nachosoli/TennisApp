import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('results')
@Controller('results')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit match score' })
  async submitScore(
    @Body() createDto: CreateResultDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.resultsService.submitScore(userId, createDto);
  }

  @Get('matches/:matchId')
  @ApiOperation({ summary: 'Get result for a match' })
  async getResult(@Param('matchId') matchId: string) {
    return this.resultsService.getResult(matchId);
  }

  @Patch('matches/:matchId/dispute')
  @ApiOperation({ summary: 'Dispute a submitted score' })
  async disputeScore(
    @Param('matchId') matchId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.resultsService.disputeScore(userId, matchId);
  }
}

