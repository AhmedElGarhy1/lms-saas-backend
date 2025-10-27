// ActivityType is now handled by domain-specific enums

export interface CreateActivityLogDto {
  type: string;
  description?: string;
  metadata?: Record<string, any>;
  actorId?: string | null;
  centerId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}
