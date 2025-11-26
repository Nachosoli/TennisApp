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
  role: 'user' | 'admin'; // Backend returns lowercase
  ratingType?: 'utr' | 'usta' | 'ultimate' | 'custom';
  ratingValue?: number;
  gender?: 'male' | 'female';
  homeCourtId?: string;
  homeCourt?: Court; // Home court relation
  bio?: string;
  photoUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  stats?: UserStats;
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
  cancelledMatches?: number;
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
  surface: 'hard' | 'clay' | 'grass' | 'indoor';
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
  status: 'available' | 'locked' | 'confirmed' | 'completed' | 'cancelled';
  lockedByUserId?: string;
  lockedAt?: string;
  expiresAt?: string;
  applications?: Application[]; // Changed from application (singular) to applications (array)
}

export interface Match {
  id: string;
  creatorUserId: string;
  creator?: User;
  courtId: string;
  court?: Court;
  date: string;
  format?: 'singles' | 'doubles';
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';
  gender: 'male' | 'female' | 'any';
  maxDistance?: number; // in meters
  surface?: 'hard' | 'clay' | 'grass' | 'indoor';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
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
  status: 'pending' | 'confirmed' | 'rejected' | 'waitlisted' | 'expired';
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
  type: 'match_created' | 'match_accepted' | 'match_confirmed' | 'court_changes' | 'score_reminder' | 'new_chat';
  channel: 'email' | 'sms' | 'push';
  content: string;
  status: 'pending' | 'sent' | 'failed';
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
  surfaceFilter?: 'hard' | 'clay' | 'grass' | 'indoor';
  slots: {
    startTime: string;
    endTime: string;
  }[];
}


