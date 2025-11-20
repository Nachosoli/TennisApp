import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail');

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SENDGRID_API_KEY') return 'test-api-key';
              if (key === 'SENDGRID_FROM_EMAIL') return 'test@example.com';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([{ statusCode: 202 }]);

      const result = await service.sendEmail('test@example.com', 'Test', '<p>Test</p>');

      expect(result).toBe(true);
      expect(sgMail.send).toHaveBeenCalled();
    });

    it('should return false if API key not configured', async () => {
      configService.get.mockReturnValue(undefined);

      const newService = new EmailService(configService);
      const result = await newService.sendEmail('test@example.com', 'Test', '<p>Test</p>');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (sgMail.send as jest.Mock).mockRejectedValue(new Error('Send failed'));

      const result = await service.sendEmail('test@example.com', 'Test', '<p>Test</p>');

      expect(result).toBe(false);
    });
  });

  describe('email templates', () => {
    it('should generate match created email', () => {
      const html = service.generateMatchCreatedEmail({
        creatorName: 'John Doe',
        courtName: 'Central Park',
        date: '2024-01-15',
        time: '10:00 AM',
      });

      expect(html).toContain('John Doe');
      expect(html).toContain('Central Park');
      expect(html).toContain('2024-01-15');
    });

    it('should generate match confirmed email', () => {
      const html = service.generateMatchConfirmedEmail({
        opponentName: 'Jane Smith',
        courtName: 'Central Park',
        date: '2024-01-15',
        time: '10:00 AM',
      });

      expect(html).toContain('Jane Smith');
      expect(html).toContain('Match Confirmed');
    });
  });
});

