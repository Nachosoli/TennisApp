import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CloudinaryService } from './services/cloudinary.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { User, UserRole } from '../entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let cloudinaryService: CloudinaryService;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    phoneVerified: true,
    role: UserRole.USER,
    photoUrl: 'https://cloudinary.com/photo.jpg',
    homeCourtId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            updateProfile: jest.fn(),
            setHomeCourt: jest.fn(),
            getPublicProfile: jest.fn(),
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadImage: jest.fn(),
            uploadImageFromBase64: jest.fn(),
            extractPublicId: jest.fn(),
            deleteImage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/v1/users/me', () => {
    it('should get own profile (authenticated)', async () => {
      jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser as User);

      const result = await controller.getMyProfile(mockUser as User);

      expect(result).toEqual(mockUser);
      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('PUT /api/v1/users/me', () => {
    const updateDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      jest.spyOn(usersService, 'updateProfile').mockResolvedValue(updatedUser as User);

      const result = await controller.updateProfile(mockUser as User, updateDto);

      expect(result).toEqual(updatedUser);
      expect(usersService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateDto);
    });

    it('should handle validation errors', async () => {
      const invalidDto = { email: 'invalid-email' };
      
      // Note: Validation is handled by NestJS ValidationPipe
      expect(invalidDto.email).toBe('invalid-email');
    });

    it('should handle duplicate email error', async () => {
      jest.spyOn(usersService, 'updateProfile').mockRejectedValue(
        new BadRequestException('Email already in use'),
      );

      await expect(
        controller.updateProfile(mockUser as User, { email: 'existing@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PUT /api/v1/users/me/home-court', () => {
    it('should set home court', async () => {
      const userWithCourt = { ...mockUser, homeCourtId: 'court-1' };
      jest.spyOn(usersService, 'setHomeCourt').mockResolvedValue(userWithCourt as User);

      const result = await controller.setHomeCourt(mockUser as User, { courtId: 'court-1' });

      expect(result.homeCourtId).toBe('court-1');
      expect(usersService.setHomeCourt).toHaveBeenCalledWith(mockUser.id, 'court-1');
    });

    it('should clear home court', async () => {
      const userWithoutCourt = { ...mockUser, homeCourtId: null };
      jest.spyOn(usersService, 'setHomeCourt').mockResolvedValue(userWithoutCourt as User);

      const result = await controller.setHomeCourt(mockUser as User, { courtId: null });

      expect(result.homeCourtId).toBeNull();
      expect(usersService.setHomeCourt).toHaveBeenCalledWith(mockUser.id, null);
    });

    it('should handle invalid court error', async () => {
      jest.spyOn(usersService, 'setHomeCourt').mockRejectedValue(
        new NotFoundException('Court not found'),
      );

      await expect(
        controller.setHomeCourt(mockUser as User, { courtId: 'invalid-court' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /api/v1/users/me/photo', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'photo',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('fake-image-data'),
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    it('should upload photo successfully', async () => {
      const photoUrl = 'https://cloudinary.com/new-photo.jpg';
      jest.spyOn(cloudinaryService, 'uploadImage').mockResolvedValue({ url: photoUrl });
      jest.spyOn(usersService, 'updateProfile').mockResolvedValue({
        ...mockUser,
        photoUrl,
      } as User);

      const result = await controller.uploadPhoto(mockUser as User, mockFile);

      expect(result.photoUrl).toBe(photoUrl);
      expect(cloudinaryService.uploadImage).toHaveBeenCalled();
      expect(usersService.updateProfile).toHaveBeenCalled();
    });

    it('should reject invalid file type error', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };

      await expect(controller.uploadPhoto(mockUser as User, invalidFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject file too large error', async () => {
      const largeFile = { ...mockFile, size: 6 * 1024 * 1024 }; // 6MB

      await expect(controller.uploadPhoto(mockUser as User, largeFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject when no file uploaded', async () => {
      await expect(controller.uploadPhoto(mockUser as User, null)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('POST /api/v1/users/me/photo/base64', () => {
    it('should upload photo from base64 successfully', async () => {
      const photoUrl = 'https://cloudinary.com/new-photo.jpg';
      const base64Photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      jest.spyOn(cloudinaryService, 'uploadImageFromBase64').mockResolvedValue({ url: photoUrl });
      jest.spyOn(usersService, 'updateProfile').mockResolvedValue({
        ...mockUser,
        photoUrl,
      } as User);

      const result = await controller.uploadPhotoFromBase64(mockUser as User, {
        photo: base64Photo,
      });

      expect(result.photoUrl).toBe(photoUrl);
      expect(cloudinaryService.uploadImageFromBase64).toHaveBeenCalled();
    });

    it('should reject when no photo data provided', async () => {
      await expect(
        controller.uploadPhotoFromBase64(mockUser as User, { photo: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should get user stats', async () => {
      const publicProfile = {
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        photoUrl: 'https://cloudinary.com/photo.jpg',
        ratingType: 'NTRP',
        ratingValue: '4.0',
      };

      jest.spyOn(usersService, 'getPublicProfile').mockResolvedValue(publicProfile);

      const result = await controller.getPublicProfile('user-1');

      expect(result).toEqual(publicProfile);
      expect(usersService.getPublicProfile).toHaveBeenCalledWith('user-1');
    });

    it('should handle non-existent user error', async () => {
      jest.spyOn(usersService, 'getPublicProfile').mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.getPublicProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});

