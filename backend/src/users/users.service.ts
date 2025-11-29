import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudinaryService } from './services/cloudinary.service';

@Injectable()
export class UsersService {
  private readonly USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly HOME_COURT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cloudinaryService: CloudinaryService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findById(id: string): Promise<User> {
    // Check cache first
    const cacheKey = `user:${id}`;
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query timeout is handled by database connection pool settings
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.homeCourt', 'homeCourt')
      .leftJoinAndSelect('user.stats', 'stats')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cache the user for 5 minutes
    await this.cacheManager.set(cacheKey, user, this.USER_CACHE_TTL);

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(userId);

    // If photoUrl is being updated and user has an existing photo, delete old one
    if (updateDto.photoUrl && user.photoUrl && updateDto.photoUrl !== user.photoUrl) {
      const oldPublicId = this.cloudinaryService.extractPublicId(user.photoUrl);
      if (oldPublicId) {
        await this.cloudinaryService.deleteImage(oldPublicId);
      }
    }

    // Explicitly handle homeCourtId to allow clearing (null) or setting (string)
    if ('homeCourtId' in updateDto) {
      (user as any).homeCourtId = updateDto.homeCourtId ?? null;
    }

    // Apply other updates (excluding homeCourtId which we handled above)
    const { homeCourtId, ...otherUpdates } = updateDto;
    Object.assign(user, otherUpdates);
    
    await this.userRepository.save(user);
    
    // Invalidate cache
    const cacheKey = `user:${userId}`;
    await this.cacheManager.del(cacheKey);
    
    // Return user with relations loaded (especially homeCourt)
    const updatedUser = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.homeCourt', 'homeCourt')
      .leftJoinAndSelect('user.stats', 'stats')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    // Cache the updated user
    await this.cacheManager.set(cacheKey, updatedUser, this.USER_CACHE_TTL);

    return updatedUser;
  }

  async setHomeCourt(userId: string, courtId: string | null): Promise<User> {
    const user = await this.findById(userId);
    // TypeORM handles null properly, but TypeScript needs explicit cast
    (user as any).homeCourtId = courtId;
    return this.userRepository.save(user);
  }

  async getPublicProfile(userId: string): Promise<Partial<User>> {
    const user = await this.findById(userId);

    // Return limited profile (name, photo, rating) as per requirements
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      ratingType: user.ratingType,
      ratingValue: user.ratingValue,
    };
  }
}

