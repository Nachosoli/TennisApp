import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';
import { BadRequestException } from '@nestjs/common';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                CLOUDINARY_CLOUD_NAME: 'test-cloud',
                CLOUDINARY_API_KEY: 'test-key',
                CLOUDINARY_API_SECRET: 'test-secret',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should check if service is configured', () => {
    const isConfigured = service.isServiceConfigured();
    expect(isConfigured).toBe(true);
  });

  it('should extract public ID from Cloudinary URL', () => {
    const url = 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/courtmate/users/user-123.jpg';
    const publicId = service.extractPublicId(url);
    expect(publicId).toBe('courtmate/users/user-123');
  });

  it('should return null for non-Cloudinary URL', () => {
    const url = 'https://example.com/image.jpg';
    const publicId = service.extractPublicId(url);
    expect(publicId).toBeNull();
  });
});

