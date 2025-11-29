export enum NotificationType {
  MATCH_CREATED = 'match_created',
  MATCH_ACCEPTED = 'match_accepted',
  MATCH_APPLICANT = 'match_applicant',
  MATCH_CONFIRMED = 'match_confirmed',
  COURT_CHANGES = 'court_changes',
  SCORE_REMINDER = 'score_reminder',
  NEW_CHAT = 'new_chat',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

