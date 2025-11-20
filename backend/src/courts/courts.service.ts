import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Court, SurfaceType } from '../entities/court.entity';
import { User } from '../entities/user.entity';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { CreateCourtFromGooglePlaceDto } from './dto/create-court-from-google-place.dto';
import { GooglePlacesService } from './services/google-places.service';
import { Point } from 'geojson';

@Injectable()
export class CourtsService {
  private readonly COURTS_DROPDOWN_CACHE_KEY = 'courts:dropdown';
  private readonly COURT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private googlePlacesService: GooglePlacesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(userId: string, createDto: CreateCourtDto): Promise<Court> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate and geocode address
    let latitude = createDto.latitude;
    let longitude = createDto.longitude;
    let formattedAddress = createDto.address;

    try {
      const geocoded = await this.googlePlacesService.validateAndGeocodeAddress(
        createDto.address,
      );
      formattedAddress = geocoded.formattedAddress;
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
    } catch (error) {
      // If geocoding fails but coordinates provided, use them
      if (!latitude || !longitude) {
        throw error;
      }
    }

    if (!latitude || !longitude) {
      throw new BadRequestException('Valid address or coordinates required');
    }

    // Create Point geometry
    const coordinates: Point = {
      type: 'Point',
      coordinates: [longitude, latitude], // GeoJSON format: [lng, lat]
    };

    const court = this.courtRepository.create({
      name: createDto.name,
      address: formattedAddress,
      coordinates,
      surfaceType: createDto.surfaceType,
      isPublic: createDto.isPublic ?? true,
      createdByUserId: userId,
    });

    return this.courtRepository.save(court);
  }

  async createFromGooglePlace(
    userId: string,
    createDto: CreateCourtFromGooglePlaceDto,
  ): Promise<Court> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if a court with the same placeId already exists
    if (createDto.placeId) {
      // Note: We don't have a placeId column yet, but we can check by address
      const existingCourt = await this.courtRepository.findOne({
        where: { address: createDto.address },
      });
      if (existingCourt) {
        return existingCourt;
      }
    }

    // Create Point geometry
    const coordinates: Point = {
      type: 'Point',
      coordinates: [createDto.longitude, createDto.latitude], // GeoJSON format: [lng, lat]
    };

    const court = this.courtRepository.create({
      name: createDto.name,
      address: createDto.address,
      coordinates,
      surfaceType: SurfaceType.HARD, // Default to HARD for Google Places
      isPublic: true, // Assume public for Google Places
      createdByUserId: userId,
    });

    return this.courtRepository.save(court);
  }

  async findAll(): Promise<Court[]> {
    return this.courtRepository.find({
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      withDeleted: false,
    });
  }

  async findById(id: string): Promise<Court> {
    const court = await this.courtRepository.findOne({
      where: { id },
      relations: ['createdBy', 'matches'],
      withDeleted: false,
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    return court;
  }

  async findByName(name: string): Promise<Court[]> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return [];
    }
    
    const courts = await this.courtRepository
      .createQueryBuilder('court')
      .where('LOWER(court.name) LIKE LOWER(:name)', { name: `%${trimmedName}%` })
      .andWhere('court.deletedAt IS NULL')
      .orderBy('court.name', 'ASC')
      .limit(10)
      .getMany();

    return courts;
  }

  async update(
    userId: string,
    courtId: string,
    updateDto: UpdateCourtDto,
  ): Promise<Court> {
    const court = await this.findById(courtId);

    // Only creator or admin can update
    if (court.createdByUserId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || !user.isAdmin) {
        throw new ForbiddenException('Not authorized to update this court');
      }
    }

    Object.assign(court, updateDto);
    return this.courtRepository.save(court);
  }

  async delete(userId: string, courtId: string): Promise<void> {
    const court = await this.findById(courtId);

    // Only creator or admin can delete
    if (court.createdByUserId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || !user.isAdmin) {
        throw new ForbiddenException('Not authorized to delete this court');
      }
    }

    // Soft delete
    await this.courtRepository.softDelete(courtId);
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000,
  ): Promise<Court[]> {
    // Using PostGIS ST_DWithin for distance queries
    const courts = await this.courtRepository
      .createQueryBuilder('court')
      .where('court.deletedAt IS NULL')
      .andWhere(
        `ST_DWithin(
          court.coordinates::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        {
          lng: longitude,
          lat: latitude,
          radius: radiusMeters,
        },
      )
      .orderBy(
        `ST_Distance(
          court.coordinates::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'ASC',
      )
      .getMany();

    return courts;
  }

  async findAllForDropdown(): Promise<{ id: string; name: string; address: string }[]> {
    const courts = await this.courtRepository.find({
      select: ['id', 'name', 'address'],
      order: { name: 'ASC' },
      withDeleted: false,
    });

    return courts.map((court) => ({
      id: court.id,
      name: court.name,
      address: court.address,
    }));
  }
}

