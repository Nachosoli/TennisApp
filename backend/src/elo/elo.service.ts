import { Injectable } from '@nestjs/common';

@Injectable()
export class EloService {
  private readonly K_FACTOR = 20; // K-factor for ELO calculation
  private readonly INITIAL_ELO = 1000;

  /**
   * Calculate new ELO ratings after a match
   * @param elo1 Current ELO of player 1
   * @param elo2 Current ELO of player 2
   * @param player1Won Whether player 1 won the match
   * @returns New ELO ratings for both players
   */
  calculateElo(elo1: number, elo2: number, player1Won: boolean): {
    newElo1: number;
    newElo2: number;
  } {
    // Expected score for player 1
    const expectedScore1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));

    // Actual score (1 if player 1 won, 0 if player 2 won)
    const actualScore1 = player1Won ? 1 : 0;

    // Calculate new ELO for player 1
    const newElo1 = Math.round(elo1 + this.K_FACTOR * (actualScore1 - expectedScore1));

    // Calculate new ELO for player 2 (inverse)
    const newElo2 = Math.round(elo2 + this.K_FACTOR * ((1 - actualScore1) - (1 - expectedScore1)));

    return {
      newElo1: Math.max(newElo1, 0), // Ensure ELO doesn't go negative
      newElo2: Math.max(newElo2, 0),
    };
  }

  getInitialElo(): number {
    return this.INITIAL_ELO;
  }

  getKFactor(): number {
    return this.K_FACTOR;
  }
}

