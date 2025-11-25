// ActivityType is now handled by domain-specific enums

export interface CreateActivityLogDto {
  type: string;
  description?: string;
  metadata?: Record<string, any>;
  targetUserId?: string | null; // Who was affected by the action (optional)
  targetUserProfileId?: string | null; // User profile ID - will be used to fetch targetUserId if targetUserId is not provided
  centerId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}
