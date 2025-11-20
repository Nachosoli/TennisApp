import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { MatchFormat, MatchStatus } from '../entities/match.entity';

@ApiTags('matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new match' })
  @ApiResponse({ status: 201, description: 'Match created successfully' })
  @ApiResponse({ status: 403, description: 'User cannot create matches' })
  async create(@CurrentUser() user: User, @Body() createDto: CreateMatchDto) {
    return this.matchesService.create(user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all matches with optional filters' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'format', enum: MatchFormat, required: false })
  @ApiQuery({ name: 'status', enum: MatchStatus, required: false })
  @ApiQuery({ name: 'skillLevel', required: false, type: Number })
  @ApiQuery({ name: 'gender', required: false })
  @ApiQuery({ name: 'maxDistance', required: false, type: Number })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'surfaceType', required: false })
  @ApiResponse({ status: 200, description: 'List of matches' })
  async findAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('format') format?: MatchFormat,
    @Query('status') status?: MatchStatus,
    @Query('skillLevel') skillLevel?: string,
    @Query('gender') gender?: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('surfaceType') surfaceType?: string,
  ) {
    const filters: any = {};

    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);
    if (format) filters.format = format;
    if (status) filters.status = status;
    if (skillLevel) filters.skillLevel = parseFloat(skillLevel);
    if (gender) filters.gender = gender;
    if (maxDistance) filters.maxDistance = parseFloat(maxDistance) * 1609.34; // Convert miles to meters
    if (lat && lng) {
      filters.latitude = parseFloat(lat);
      filters.longitude = parseFloat(lng);
    }
    if (surfaceType) filters.surfaceType = surfaceType;

    return this.matchesService.findAll(filters);
  }

  @Get('calendar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get calendar view of matches' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiResponse({ status: 200, description: 'Calendar matches' })
  async getCalendar(
    @CurrentUser() user: User,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    // Get user preferences from profile
    const userPreferences = {
      skillLevel: user.ratingValue ? Number(user.ratingValue) : undefined,
      gender: undefined, // Could add to user profile
      maxDistance: undefined, // Could add to user profile
      latitude: user.homeCourt?.coordinates?.coordinates?.[1],
      longitude: user.homeCourt?.coordinates?.coordinates?.[0],
      surfaceType: undefined,
    };

    return this.matchesService.getCalendar(
      user.id,
      new Date(dateFrom),
      new Date(dateTo),
      userPreferences,
    );
  }

  @Get('my-matches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get matches where user participated (as creator or confirmed applicant)' })
  @ApiResponse({ status: 200, description: 'List of user matches' })
  async getMyMatches(@CurrentUser() user: User) {
    return this.matchesService.findUserMatches(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get match by ID' })
  @ApiResponse({ status: 200, description: 'Match details' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  async findOne(@Param('id') id: string) {
    return this.matchesService.findByIdWithDetails(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update match' })
  @ApiResponse({ status: 200, description: 'Match updated successfully' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateMatchDto,
  ) {
    return this.matchesService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete match' })
  @ApiResponse({ status: 200, description: 'Match deleted successfully' })
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    await this.matchesService.cancel(user.id, id);
  }
}

