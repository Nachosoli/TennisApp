import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { CloudinaryService } from './services/cloudinary.service';
import { User } from '../entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let cloudinaryService: CloudinaryService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    phoneVerified: true,
    role: 'user' as any,
    isActive: true,
    photoUrl: 'https://cloudinary.com/old-photo.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            extractPublicId: jest.fn(),
            deleteImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findById('user-1');
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        relations: ['homeCourt', 'stats'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, firstName: 'Updated' } as User);
      jest.spyOn(cloudinaryService, 'extractPublicId').mockReturnValue('old-public-id');

      const updateDto = { firstName: 'Updated' };
      const result = await service.updateProfile('user-1', updateDto);

      expect(result.firstName).toBe('Updated');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should delete old photo when updating photoUrl', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, photoUrl: 'https://cloudinary.com/new-photo.jpg' } as User);
      jest.spyOn(cloudinaryService, 'extractPublicId').mockReturnValue('old-public-id');
      jest.spyOn(cloudinaryService, 'deleteImage').mockResolvedValue(undefined);

      const updateDto = { photoUrl: 'https://cloudinary.com/new-photo.jpg' };
      await service.updateProfile('user-1', updateDto);

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('old-public-id');
    });
  });

  describe('getPublicProfile', () => {
    it('should return limited profile information', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.getPublicProfile('user-1');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('photoUrl');
      expect(result).toHaveProperty('ratingType');
      expect(result).toHaveProperty('ratingValue');
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('setHomeCourt', () => {
    it('should set home court', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, homeCourtId: 'court-1' } as User);

      const result = await service.setHomeCourt('user-1', 'court-1');

      expect(result.homeCourtId).toBe('court-1');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should clear home court', async () => {
      const userWithCourt = { ...mockUser, homeCourtId: 'court-1' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithCourt);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...userWithCourt, homeCourtId: null } as User);

      const result = await service.setHomeCourt('user-1', null);

      expect(result.homeCourtId).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should validate email uniqueness', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

      const updateDto = { email: 'newemail@example.com' };
      await service.updateProfile('user-1', updateDto);

      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should validate phone format', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, phone: '+1234567890' } as User);

      const updateDto = { phone: '+1234567890' };
      await service.updateProfile('user-1', updateDto);

      expect(userRepository.save).toHaveBeenCalled();
    });
  });
});

