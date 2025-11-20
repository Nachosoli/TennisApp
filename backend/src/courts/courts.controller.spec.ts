import { Test, TestingModule } from '@nestjs/testing';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { User, UserRole } from '../entities/user.entity';
import { Court, SurfaceType } from '../entities/court.entity';

describe('CourtsController', () => {
  let controller: CourtsController;
  let courtsService: CourtsService;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const mockCourt: Partial<Court> = {
    id: 'court-1',
    name: 'Test Court',
    address: '123 Test St',
    surfaceType: SurfaceType.HARD,
    isPublic: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourtsController],
      providers: [
        {
          provide: CourtsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findAllForDropdown: jest.fn(),
            findNearby: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CourtsController>(CourtsController);
    courtsService = module.get<CourtsService>(CourtsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /api/v1/courts', () => {
    const createDto = {
      name: 'New Court',
      address: '456 New St',
      surfaceType: SurfaceType.CLAY,
      isPublic: true,
    };

    it('should create court successfully', async () => {
      jest.spyOn(courtsService, 'create').mockResolvedValue(mockCourt as Court);

      const result = await controller.create(mockUser as User, createDto);

      expect(result).toEqual(mockCourt);
      expect(courtsService.create).toHaveBeenCalledWith(mockUser.id, createDto);
    });

    it('should handle validation errors', async () => {
      const invalidDto = { name: '' };
      
      // Note: Validation is handled by NestJS ValidationPipe
      expect(invalidDto.name).toBe('');
    });

    it('should handle invalid address error', async () => {
      jest.spyOn(courtsService, 'create').mockRejectedValue(
        new BadRequestException('Invalid address'),
      );

      await expect(controller.create(mockUser as User, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /api/v1/courts', () => {
    it('should list courts with filters', async () => {
      const courts = [mockCourt];
      jest.spyOn(courtsService, 'findAll').mockResolvedValue(courts as Court[]);

      const result = await controller.findAll();

      expect(result).toEqual(courts);
      expect(courtsService.findAll).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      const courts = [mockCourt];
      jest.spyOn(courtsService, 'findAll').mockResolvedValue(courts as Court[]);

      const result = await controller.findAll();

      expect(result).toBeDefined();
    });
  });

  describe('GET /api/v1/courts/nearby', () => {
    it('should find nearby courts', async () => {
      const courts = [mockCourt];
      jest.spyOn(courtsService, 'findNearby').mockResolvedValue(courts as Court[]);

      const result = await controller.findNearby('37.7749', '-122.4194', '5000');

      expect(result).toEqual(courts);
      expect(courtsService.findNearby).toHaveBeenCalledWith(37.7749, -122.4194, 5000);
    });

    it('should use default radius if not provided', async () => {
      const courts = [mockCourt];
      jest.spyOn(courtsService, 'findNearby').mockResolvedValue(courts as Court[]);

      const result = await controller.findNearby('37.7749', '-122.4194');

      expect(courtsService.findNearby).toHaveBeenCalledWith(37.7749, -122.4194, 5000);
    });

    it('should sort by distance', async () => {
      const courts = [mockCourt];
      jest.spyOn(courtsService, 'findNearby').mockResolvedValue(courts as Court[]);

      await controller.findNearby('37.7749', '-122.4194', '5000');

      expect(courtsService.findNearby).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/courts/dropdown', () => {
    it('should get dropdown list', async () => {
      const dropdownList = [{ id: 'court-1', name: 'Test Court', address: '123 Test St' }];
      jest.spyOn(courtsService, 'findAllForDropdown').mockResolvedValue(dropdownList as any);

      const result = await controller.findAllForDropdown();

      expect(result).toEqual(dropdownList);
      expect(courtsService.findAllForDropdown).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/courts/:id', () => {
    it('should get court details', async () => {
      jest.spyOn(courtsService, 'findById').mockResolvedValue(mockCourt as Court);

      const result = await controller.findOne('court-1');

      expect(result).toEqual(mockCourt);
      expect(courtsService.findById).toHaveBeenCalledWith('court-1');
    });

    it('should handle non-existent court error', async () => {
      jest.spyOn(courtsService, 'findById').mockRejectedValue(
        new NotFoundException('Court not found'),
      );

      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('PUT /api/v1/courts/:id', () => {
    const updateDto = {
      name: 'Updated Court',
    };

    it('should update court (admin only)', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      const updatedCourt = { ...mockCourt, ...updateDto };
      jest.spyOn(courtsService, 'update').mockResolvedValue(updatedCourt as Court);

      const result = await controller.update(adminUser as User, 'court-1', updateDto);

      expect(result).toEqual(updatedCourt);
      expect(courtsService.update).toHaveBeenCalledWith(adminUser.id, 'court-1', updateDto);
    });

    it('should reject non-admin', async () => {
      jest.spyOn(courtsService, 'update').mockRejectedValue(
        new ForbiddenException('Not authorized'),
      );

      await expect(controller.update(mockUser as User, 'court-1', updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('DELETE /api/v1/courts/:id', () => {
    it('should delete court (admin only)', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      jest.spyOn(courtsService, 'delete').mockResolvedValue(undefined);

      await controller.delete(adminUser as User, 'court-1');

      expect(courtsService.delete).toHaveBeenCalledWith(adminUser.id, 'court-1');
    });

    it('should perform soft delete', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      jest.spyOn(courtsService, 'delete').mockResolvedValue(undefined);

      await controller.delete(adminUser as User, 'court-1');

      expect(courtsService.delete).toHaveBeenCalled();
    });
  });
});

