export type RatingType = 'utr' | 'usta' | 'ultimate' | 'custom' | '';

export interface RatingValueOption {
  value: number;
  label: string;
}

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';

/**
 * Get rating value options based on rating type
 */
export function getRatingValueOptions(ratingType: RatingType): RatingValueOption[] {
  switch (ratingType) {
    case 'ultimate':
      // Ultimate: 2.0 to 5.0 in 0.5 increments
      return Array.from({ length: 7 }, (_, i) => {
        const value = 2.0 + i * 0.5;
        return { value, label: value.toString() };
      });

    case 'usta':
      // USTA: 1.5 to 7.0 in 0.5 increments
      return Array.from({ length: 12 }, (_, i) => {
        const value = 1.5 + i * 0.5;
        return { value, label: value.toString() };
      });

    case 'utr':
      // UTR: 1.0 to 16.5 in 0.5 increments
      return Array.from({ length: 32 }, (_, i) => {
        const value = 1.0 + i * 0.5;
        return { value, label: value.toString() };
      });

    case 'custom':
      // Custom: Show skill level labels
      return [
        { value: 1, label: 'Beginner' },
        { value: 2, label: 'Intermediate' },
        { value: 3, label: 'Advanced' },
        { value: 4, label: 'Pro' },
      ];

    default:
      return [];
  }
}

/**
 * Get skill level from rating value based on rating type
 */
export function getSkillLevelFromRating(
  ratingType: RatingType,
  ratingValue: number | null | undefined
): SkillLevel | null {
  if (!ratingType || ratingValue === null || ratingValue === undefined) {
    return null;
  }

  switch (ratingType) {
    case 'ultimate':
      if (ratingValue >= 2.0 && ratingValue <= 3.0) return 'BEGINNER';
      if (ratingValue > 3.0 && ratingValue < 4.0) return 'INTERMEDIATE';
      if (ratingValue >= 4.0 && ratingValue <= 5.0) return 'ADVANCED';
      if (ratingValue > 5.0) return 'PRO';
      return null;

    case 'usta':
      if (ratingValue >= 1.5 && ratingValue <= 3.5) return 'BEGINNER';
      if (ratingValue > 3.5 && ratingValue < 4.5) return 'INTERMEDIATE';
      if (ratingValue >= 4.5 && ratingValue <= 5.5) return 'ADVANCED';
      if (ratingValue >= 6.0) return 'PRO';
      return null;

    case 'utr':
      if (ratingValue >= 1.0 && ratingValue < 4.0) return 'BEGINNER'; // < 4.0 to avoid overlap
      if (ratingValue >= 4.0 && ratingValue < 6.0) return 'INTERMEDIATE';
      if (ratingValue >= 6.0 && ratingValue <= 10.0) return 'ADVANCED';
      if (ratingValue > 10.0) return 'PRO';
      return null;

    case 'custom':
      if (ratingValue === 1) return 'BEGINNER';
      if (ratingValue === 2) return 'INTERMEDIATE';
      if (ratingValue === 3) return 'ADVANCED';
      if (ratingValue === 4) return 'PRO';
      return null;

    default:
      return null;
  }
}

/**
 * Check if a rating value falls within a skill level range for a given rating type
 */
export function isRatingInSkillLevel(
  ratingType: RatingType,
  ratingValue: number | null | undefined,
  skillLevel: SkillLevel
): boolean {
  if (!ratingType || ratingValue === null || ratingValue === undefined) {
    return false;
  }

  const userSkillLevel = getSkillLevelFromRating(ratingType, ratingValue);
  return userSkillLevel === skillLevel;
}

/**
 * Get the maximum rating value for a rating type
 */
export function getMaxRatingValue(ratingType: RatingType): number {
  switch (ratingType) {
    case 'ultimate':
      return 5.0;
    case 'usta':
      return 7.0;
    case 'utr':
      return 16.5;
    case 'custom':
      return 4;
    default:
      return 12; // Default fallback
  }
}

/**
 * Get the minimum rating value for a rating type
 */
export function getMinRatingValue(ratingType: RatingType): number {
  switch (ratingType) {
    case 'ultimate':
      return 2.0;
    case 'usta':
      return 1.5;
    case 'utr':
      return 1.0;
    case 'custom':
      return 1;
    default:
      return 0;
  }
}

