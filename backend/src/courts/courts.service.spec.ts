import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CourtsService } from './courts.service';
import { GooglePlacesService } from './services/google-places.service';
import { Court, SurfaceType } from '../entities/court.entity';
import { User, UserRole } from '../entities/user.entity';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { Point } from 'geojson';

describe('CourtsService', () => {
  let service: CourtsService;
  let courtRepository: Repository<Court>;
  let userRepository: Repository<User>;
  let googlePlacesService: GooglePlacesService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    isActive: true,
    bannedAt: null,
    suspendedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockCourt: Court = {
    id: 'court-1',
    name: 'Test Court',
    address: '123 Test St, Test City',
    coordinates: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749],
    } as Point,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    createdByUserId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Court;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtsService,
        {
          provide: getRepositoryToken(Court),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: GooglePlacesService,
          useValue: {
            validateAndGeocodeAddress: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CourtsService>(CourtsService);
    courtRepository = module.get<Repository<Court>>(getRepositoryToken(Court));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    googlePlacesService = module.get<GooglePlacesService>(GooglePlacesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCourtDto = {
      name: 'New Court',
      address: '123 Main St',
      surfaceType: SurfaceType.HARD,
      isPublic: true,
    };

    it('should create court with valid data', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(googlePlacesService, 'validateAndGeocodeAddress').mockResolvedValue({
        formattedAddress: '123 Main St, City',
        latitude: 37.7749,
        longitude: -122.4194,
      });
      jest.spyOn(courtRepository, 'create').mockReturnValue(mockCourt as Court);
      jest.spyOn(courtRepository, 'save').mockResolvedValue(mockCourt);

      const result = await service.create('user-1', createDto);

      expect(result).toBeDefined();
      expect(courtRepository.save).toHaveBeenCalled();
    });

    it('should validate address with Google Places API', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(googlePlacesService, 'validateAndGeocodeAddress').mockResolvedValue({
        formattedAddress: '123 Main St, City',
        latitude: 37.7749,
        longitude: -122.4194,
      });
      jest.spyOn(courtRepository, 'create').mockReturnValue(mockCourt as Court);
      jest.spyOn(courtRepository, 'save').mockResolvedValue(mockCourt);

      await service.create('user-1', createDto);

      expect(googlePlacesService.validateAndGeocodeAddress).toHaveBeenCalledWith(createDto.address);
    });

    it('should handle Google Places API errors', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(googlePlacesService, 'validateAndGeocodeAddress').mockRejectedValue(
        new BadRequestException('Address not found'),
      );

      await expect(service.create('user-1', createDto)).rejects.toThrow(BadRequestException);
    });

    it('should use provided coordinates if geocoding fails', async () => {
      const createDtoWithCoords: CreateCourtDto = {
        ...createDto,
        latitude: 37.7749,
        longitude: -122.4194,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(googlePlacesService, 'validateAndGeocodeAddress').mockRejectedValue(
        new BadRequestException('Address not found'),
      );
      jest.spyOn(courtRepository, 'create').mockReturnValue(mockCourt as Court);
      jest.spyOn(courtRepository, 'save').mockResolvedValue(mockCourt);

      const result = await service.create('user-1', createDtoWithCoords);

      expect(result).toBeDefined();
    });

    it('should set pending approval status', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(googlePlacesService, 'validateAndGeocodeAddress').mockResolvedValue({
        formattedAddress: '123 Main St',
        latitude: 37.7749,
        longitude: -122.4194,
      });
      jest.spyOn(courtRepository, 'create').mockReturnValue(mockCourt as Court);
      jest.spyOn(courtRepository, 'save').mockResolvedValue(mockCourt);

      await service.create('user-1', createDto);

      expect(courtRepository.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should list all approved courts', async () => {
      jest.spyOn(courtRepository, 'find').mockResolvedValue([mockCourt]);

      const result = await service.findAll();

      expect(result).toEqual([mockCourt]);
      expect(courtRepository.find).toHaveBeenCalledWith({
        relations: ['createdBy'],
        order: { createdAt: 'DESC' },
        withDeleted: false,
      });
    });
  });

  describe('findById', () => {
    it('should get court by ID', async () => {
      jest.spyOn(courtRepository, 'findOne').mockResolvedValue(mockCourt);

      const result = await service.findById('court-1');

      expect(result).toEqual(mockCourt);
      expect(courtRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'court-1' },
        relations: ['createdBy', 'matches'],
        withDeleted: false,
      });
    });

    it('should return null for non-existent court', async () => {
      jest.spyOn(courtRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCourtDto = {
      name: 'Updated Court',
    };

    it('should update court details', async () => {
      jest.spyOn(courtRepository, 'findOne').mockResolvedValue(mockCourt);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(courtRepository, 'save').mockResolvedValue({ ...mockCourt, ...updateDto });

      const result = await service.update('user-1', 'court-1', updateDto);

      expect(result.name).toBe('Updated Court');
      expect(courtRepository.save).toHaveBeenCalled();
    });

    it('should validate update permissions - creator can update', async () => {
      jest.spyOn(courtRepository, 'findOne').mockResolvedValue(mockCourt);
      jest.spyOn(courtRepository, 'save').mockResolvedValue(mockCourt);

      await service.update('user-1', 'court-1', updateDto);

      expect(courtRepository.save).toHaveBeenCalled();
    });

    it('should validate update permissions - admin can update', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      const courtByOther = { ...mockCourt, createdByUserId: 'other-user' };

      jest.spyOn(courtRepository, 'findOne').mockResolvedValue(courtByOther);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(adminUser);
      jest.spyOn(courtRepository, 'save').mockResolvedValue(courtByOther);

      await service.update('admin-user', 'court-1', updateDto);

      expect(courtRepository.save).toHaveBeenCalled();
    });

    it('should reject non-creator non-admin', async () => {
      const courtByOther = { ...mockCourt, createdByUserId: 'other-user' };

      jest.spyOn(courtRepository, 'findOne').mockResolvedValue(courtByOther);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.update('user-1', 'court-1', updateDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should soft delete court', async () => {
      jest.spyOn(courtRepository, 'findOne').mockResolvedValue(mockCourt);
      jest.spyOn(courtRepository, 'softDelete').mockResolvedValue({ affected: 1 } as any);

      await service.delete('user-1', 'court-1');

      expect(courtRepository.softDelete).toHaveBeenCalledWith('court-1');
    });
  });

  describe('findNearby', () => {
    it('should find courts within distance', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCourt]),
      };

      jest.spyOn(courtRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findNearby(37.7749, -122.4194, 5000);

      expect(result).toEqual([mockCourt]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should sort by distance', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCourt]),
      };

      jest.spyOn(courtRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.findNearby(37.7749, -122.4194, 5000);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
    });
  });

  describe('findAllForDropdown', () => {
    it('should return simplified court list', async () => {
      jest.spyOn(courtRepository, 'find').mockResolvedValue([mockCourt]);

      const result = await service.findAllForDropdown();

      expect(result).toEqual([
        {
          id: mockCourt.id,
          name: mockCourt.name,
          address: mockCourt.address,
        },
      ]);
    });
  });
});

