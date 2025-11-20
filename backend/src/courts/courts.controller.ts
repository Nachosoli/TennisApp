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
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { CreateCourtFromGooglePlaceDto } from './dto/create-court-from-google-place.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('courts')
@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new court' })
  @ApiResponse({ status: 201, description: 'Court created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid address or coordinates' })
  async create(
    @CurrentUser() user: User,
    @Body() createDto: CreateCourtDto,
  ) {
    return this.courtsService.create(user.id, createDto);
  }

  @Post('from-google-place')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a court from Google Place data' })
  @ApiResponse({ status: 201, description: 'Court created successfully from Google Place' })
  @ApiResponse({ status: 400, description: 'Invalid place data' })
  async createFromGooglePlace(
    @CurrentUser() user: User,
    @Body() createDto: CreateCourtFromGooglePlaceDto,
  ) {
    return this.courtsService.createFromGooglePlace(user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courts' })
  @ApiResponse({ status: 200, description: 'List of courts' })
  async findAll() {
    return this.courtsService.findAll();
  }

  @Get('dropdown')
  @ApiOperation({ summary: 'Get courts for dropdown selection' })
  @ApiResponse({ status: 200, description: 'List of courts (id, name, address)' })
  async findAllForDropdown() {
    return this.courtsService.findAllForDropdown();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for courts by name (partial match)' })
  @ApiQuery({ name: 'name', type: String, description: 'Court name to search for' })
  @ApiResponse({ status: 200, description: 'List of matching courts' })
  async searchByName(@Query('name') name: string) {
    return this.courtsService.findByName(name);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find courts near a location' })
  @ApiQuery({ name: 'lat', type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lng', type: Number, description: 'Longitude' })
  @ApiQuery({ name: 'radius', type: Number, required: false, description: 'Radius in meters (default: 5000)' })
  @ApiResponse({ status: 200, description: 'List of nearby courts' })
  async findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.courtsService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseInt(radius, 10) : 5000,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get court by ID' })
  @ApiResponse({ status: 200, description: 'Court details' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  async findOne(@Param('id') id: string) {
    return this.courtsService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update court' })
  @ApiResponse({ status: 200, description: 'Court updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateCourtDto,
  ) {
    return this.courtsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete court (soft delete)' })
  @ApiResponse({ status: 204, description: 'Court deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    await this.courtsService.delete(user.id, id);
  }
}

