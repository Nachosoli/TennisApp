import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { User, UserRole } from '../entities/user.entity';
import { Application, ApplicationStatus } from '../entities/application.entity';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let applicationsService: ApplicationsService;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    homeCourtId: 'court-1',
    phoneVerified: true,
    phone: '+1234567890',
  };

  const mockApplication: Partial<Application> = {
    id: 'app-1',
    userId: 'user-1',
    matchSlotId: 'slot-1',
    status: ApplicationStatus.PENDING,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: {
            applyToSlot: jest.fn(),
            confirmApplication: jest.fn(),
            rejectApplication: jest.fn(),
            getMyApplications: jest.fn(),
            getMatchApplications: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ApplicationsController>(ApplicationsController);
    applicationsService = module.get<ApplicationsService>(ApplicationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /api/v1/applications', () => {
    const applyDto = {
      matchSlotId: 'slot-1',
    };

    it('should apply to slot successfully', async () => {
      jest.spyOn(applicationsService, 'applyToSlot').mockResolvedValue(mockApplication as Application);

      const result = await controller.applyToSlot(mockUser as User, applyDto);

      expect(result).toEqual(mockApplication);
      expect(applicationsService.applyToSlot).toHaveBeenCalledWith(mockUser.id, applyDto);
    });

    it('should require home court error', async () => {
      const userWithoutCourt = { ...mockUser, homeCourtId: null };
      jest.spyOn(applicationsService, 'applyToSlot').mockRejectedValue(
        new BadRequestException('Home court required'),
      );

      await expect(controller.applyToSlot(userWithoutCourt as User, applyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should require phone verification error', async () => {
      const unverifiedUser = { ...mockUser, phoneVerified: false };
      jest.spyOn(applicationsService, 'applyToSlot').mockRejectedValue(
        new BadRequestException('Phone verification required'),
      );

      await expect(controller.applyToSlot(unverifiedUser as User, applyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject time overlap error', async () => {
      jest.spyOn(applicationsService, 'applyToSlot').mockRejectedValue(
        new BadRequestException('Time overlap detected'),
      );

      await expect(controller.applyToSlot(mockUser as User, applyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject slot already locked error', async () => {
      jest.spyOn(applicationsService, 'applyToSlot').mockRejectedValue(
        new BadRequestException('Slot already locked'),
      );

      await expect(controller.applyToSlot(mockUser as User, applyDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('PUT /api/v1/applications/:id/confirm', () => {
    it('should confirm application (creator only)', async () => {
      const confirmedApp = { ...mockApplication, status: ApplicationStatus.CONFIRMED };
      jest.spyOn(applicationsService, 'confirmApplication').mockResolvedValue(confirmedApp as Application);

      const result = await controller.confirmApplication(mockUser as User, 'app-1');

      expect(result).toEqual(confirmedApp);
      expect(applicationsService.confirmApplication).toHaveBeenCalledWith(mockUser.id, 'app-1');
    });

    it('should reject non-creator', async () => {
      const otherUser = { ...mockUser, id: 'user-2' };
      jest.spyOn(applicationsService, 'confirmApplication').mockRejectedValue(
        new ForbiddenException('Not authorized'),
      );

      await expect(controller.confirmApplication(otherUser as User, 'app-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('PUT /api/v1/applications/:id/reject', () => {
    it('should reject application', async () => {
      const rejectedApp = { ...mockApplication, status: ApplicationStatus.REJECTED };
      jest.spyOn(applicationsService, 'rejectApplication').mockResolvedValue(rejectedApp as Application);

      const result = await controller.rejectApplication(mockUser as User, 'app-1');

      expect(result).toEqual(rejectedApp);
      expect(applicationsService.rejectApplication).toHaveBeenCalledWith(mockUser.id, 'app-1');
    });
  });

  describe('GET /api/v1/applications/my-applications', () => {
    it('should list user applications', async () => {
      const applications = [mockApplication];
      jest.spyOn(applicationsService, 'getMyApplications').mockResolvedValue(applications as Application[]);

      const result = await controller.getMyApplications(mockUser as User);

      expect(result).toEqual(applications);
      expect(applicationsService.getMyApplications).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /api/v1/applications/match/:matchId', () => {
    it('should list match applications (creator only)', async () => {
      const applications = [mockApplication];
      jest.spyOn(applicationsService, 'getMatchApplications').mockResolvedValue(applications as Application[]);

      const result = await controller.getMatchApplications(mockUser as User, 'match-1');

      expect(result).toEqual(applications);
      expect(applicationsService.getMatchApplications).toHaveBeenCalledWith('match-1', mockUser.id);
    });

    it('should reject non-creator', async () => {
      const otherUser = { ...mockUser, id: 'user-2' };
      jest.spyOn(applicationsService, 'getMatchApplications').mockRejectedValue(
        new ForbiddenException('Not authorized'),
      );

      await expect(controller.getMatchApplications(otherUser as User, 'match-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

