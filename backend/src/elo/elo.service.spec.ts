import { Test, TestingModule } from '@nestjs/testing';
import { EloService } from './elo.service';

describe('EloService', () => {
  let service: EloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EloService],
    }).compile();

    service = module.get<EloService>(EloService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateElo', () => {
    it('should calculate ELO correctly when player 1 wins', () => {
      const { newElo1, newElo2 } = service.calculateElo(1000, 1000, true);
      
      expect(newElo1).toBeGreaterThan(1000);
      expect(newElo2).toBeLessThan(1000);
      expect(newElo1 + newElo2).toBe(2000); // Total ELO should remain constant
    });

    it('should calculate ELO correctly when player 2 wins', () => {
      const { newElo1, newElo2 } = service.calculateElo(1000, 1000, false);
      
      expect(newElo1).toBeLessThan(1000);
      expect(newElo2).toBeGreaterThan(1000);
      expect(newElo1 + newElo2).toBe(2000);
    });

    it('should give more points to underdog when they win', () => {
      const { newElo1, newElo2 } = service.calculateElo(1200, 1000, false);
      
      // Player 2 (underdog) should gain more points
      const eloChange2 = newElo2 - 1000;
      const eloChange1 = newElo1 - 1200;
      
      expect(Math.abs(eloChange2)).toBeGreaterThan(Math.abs(eloChange1));
    });

    it('should give fewer points to favorite when they win', () => {
      const { newElo1, newElo2 } = service.calculateElo(1200, 1000, true);
      
      // Player 1 (favorite) should gain fewer points
      const eloChange1 = newElo1 - 1200;
      const eloChange2 = newElo2 - 1000;
      
      expect(Math.abs(eloChange1)).toBeLessThan(Math.abs(eloChange2));
    });

    it('should never return negative ELO', () => {
      const { newElo1, newElo2 } = service.calculateElo(10, 10, false);
      
      expect(newElo1).toBeGreaterThanOrEqual(0);
      expect(newElo2).toBeGreaterThanOrEqual(0);
    });

    it('should use K-factor correctly', () => {
      expect(service.getKFactor()).toBe(20);
      
      // K-factor affects the magnitude of ELO changes
      const { newElo1, newElo2 } = service.calculateElo(1000, 1000, true);
      const eloChange = newElo1 - 1000;
      
      // With K=20, equal players should see ~10 point change
      expect(Math.abs(eloChange)).toBeGreaterThan(0);
      expect(Math.abs(eloChange)).toBeLessThanOrEqual(20);
    });

    it('should handle equal ratings', () => {
      const { newElo1, newElo2 } = service.calculateElo(1000, 1000, true);
      
      expect(newElo1).toBeGreaterThan(1000);
      expect(newElo2).toBeLessThan(1000);
      expect(newElo1 + newElo2).toBe(2000);
    });

    it('should handle large rating differences', () => {
      // Player 1 is much stronger
      const { newElo1, newElo2 } = service.calculateElo(1500, 1000, true);
      
      // Stronger player should gain fewer points
      const eloChange1 = newElo1 - 1500;
      const eloChange2 = newElo2 - 1000;
      
      expect(Math.abs(eloChange1)).toBeLessThan(Math.abs(eloChange2));
    });

    it('should handle large rating differences when underdog wins', () => {
      // Player 2 (underdog) wins
      const { newElo1, newElo2 } = service.calculateElo(1500, 1000, false);
      
      // Underdog should gain more points
      const eloChange1 = newElo1 - 1500;
      const eloChange2 = newElo2 - 1000;
      
      expect(Math.abs(eloChange2)).toBeGreaterThan(Math.abs(eloChange1));
    });

    it('should have initial ELO of 1000', () => {
      expect(service.getInitialElo()).toBe(1000);
    });
  });

  describe('updateRatings', () => {
    // Note: updateRatings is actually in ResultsService, but we test ELO calculation here
    it('should calculate ELO change for win', () => {
      const { newElo1, newElo2 } = service.calculateElo(1000, 1000, true);
      
      expect(newElo1).toBeGreaterThan(1000);
      expect(newElo2).toBeLessThan(1000);
    });

    it('should calculate ELO change for loss', () => {
      const { newElo1, newElo2 } = service.calculateElo(1000, 1000, false);
      
      expect(newElo1).toBeLessThan(1000);
      expect(newElo2).toBeGreaterThan(1000);
    });
  });
});

