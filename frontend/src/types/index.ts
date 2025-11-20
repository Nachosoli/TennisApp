// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  verified?: boolean; // Backend uses 'verified', not 'phoneVerified'
  phoneVerified?: boolean; // Keep for backward compatibility
  emailVerified?: boolean; // Email verification status
  role: 'user' | 'admin' | 'USER' | 'ADMIN'; // Backend returns lowercase
  ratingType?: 'UTR' | 'USTA' | 'ULTIMATE' | 'CUSTOM';
  ratingValue?: number;
  gender?: 'male' | 'female' | 'other';
  homeCourtId?: string;
  homeCourt?: Court; // Home court relation
  bio?: string;
  photoUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserStats {
  id: string;
  userId: string;
  singlesElo: number;
  doublesElo: number;
  winStreakSingles: number;
  winStreakDoubles: number;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
}

// Court types
export interface Court {
  id: string;
  name: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  surface: 'HARD' | 'CLAY' | 'GRASS' | 'INDOOR';
  isPublic: boolean;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

// Match types
export interface MatchSlot {
  id: string;
  matchId: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'LOCKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  lockedByUserId?: string;
  lockedAt?: string;
  expiresAt?: string;
  application?: Application;
}

export interface Match {
  id: string;
  creatorUserId: string;
  creator?: User;
  courtId: string;
  court?: Court;
  date: string;
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';
  gender: 'MALE' | 'FEMALE' | 'ANY';
  maxDistance?: number; // in meters
  surface?: 'HARD' | 'CLAY' | 'GRASS' | 'INDOOR';
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  slots?: MatchSlot[];
  results?: Result[];
  createdAt: string;
  updatedAt: string;
}

// Application types
export interface Application {
  id: string;
  applicantUserId?: string;
  userId?: string; // Legacy field
  user?: User;
  applicant?: User;
  matchSlotId: string;
  matchSlot?: MatchSlot & {
    match?: Match;
  };
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';
  guestPartnerName?: string;
  createdAt: string;
  updatedAt: string;
}

// Result types
export interface Result {
  id: string;
  matchId: string;
  match?: Match;
  score: string;
  winnerId?: string;
  winner?: User;
  player1UserId?: string;
  player1?: User;
  player2UserId?: string;
  player2?: User;
  disputed: boolean;
  submittedByUserId: string;
  createdAt: string;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: 'MATCH_CREATED' | 'MATCH_ACCEPTED' | 'MATCH_CONFIRMED' | 'COURT_CHANGES' | 'SCORE_REMINDER' | 'NEW_CHAT';
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  content: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  createdAt: string;
  read?: boolean;
}

// Chat types
export interface ChatMessage {
  id: string;
  matchId: string;
  userId: string;
  user?: User;
  message: string;
  createdAt: string;
  userName?: string;
}

export interface Report {
  id: string;
  reporterUserId: string;
  reportType: 'user' | 'match' | 'court';
  targetId: string;
  reason: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  adminUserId?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  notificationType: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Match creation DTO
export interface CreateMatchDto {
  courtId: string;
  date: string;
  format: 'singles' | 'doubles';
  skillLevelMin?: number;
  skillLevelMax?: number;
  genderFilter?: 'male' | 'female';
  maxDistance?: number;
  surfaceFilter?: 'HARD' | 'CLAY' | 'GRASS' | 'INDOOR';
  slots: {
    startTime: string;
    endTime: string;
  }[];
}

// Chat types
export interface ChatMessage {
  id: string;
  matchId: string;
  userId: string;
  message: string;
  createdAt: string;
}

