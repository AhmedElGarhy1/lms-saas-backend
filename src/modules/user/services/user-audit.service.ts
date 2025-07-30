import { Injectable, Logger } from '@nestjs/common';

export interface AuditLogEntry {
  action: string;
  userId: string;
  performedBy: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class UserAuditService {
  private readonly logger = new Logger(UserAuditService.name);

  async logUserAction(
    action: string,
    userId: string,
    performedBy: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      action,
      userId,
      performedBy,
      resourceType,
      resourceId,
      metadata,
      timestamp: new Date(),
      ipAddress,
      userAgent,
    };

    // Log to structured logging system
    this.logger.log('User action audit log', {
      ...auditEntry,
      level: 'audit',
    });

    // TODO: Store in database audit table for compliance
    // await this.auditRepository.create(auditEntry);
  }

  async logUserLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logUserAction(
      'USER_LOGIN',
      userId,
      userId,
      'USER',
      userId,
      { loginMethod: 'password' },
      ipAddress,
      userAgent,
    );
  }

  async logUserLogout(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logUserAction(
      'USER_LOGOUT',
      userId,
      userId,
      'USER',
      userId,
      {},
      ipAddress,
      userAgent,
    );
  }

  async logUserProfileUpdate(
    userId: string,
    performedBy: string,
    changes: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logUserAction(
      'USER_PROFILE_UPDATE',
      userId,
      performedBy,
      'USER_PROFILE',
      userId,
      { changes },
      ipAddress,
      userAgent,
    );
  }

  async logUserCreation(
    userId: string,
    performedBy: string,
    userData: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logUserAction(
      'USER_CREATION',
      userId,
      performedBy,
      'USER',
      userId,
      { userData },
      ipAddress,
      userAgent,
    );
  }

  async logUserDeletion(
    userId: string,
    performedBy: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logUserAction(
      'USER_DELETION',
      userId,
      performedBy,
      'USER',
      userId,
      { reason },
      ipAddress,
      userAgent,
    );
  }

  async logRoleAssignment(
    userId: string,
    performedBy: string,
    roleId: string,
    scope: string,
    centerId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logUserAction(
      'ROLE_ASSIGNMENT',
      userId,
      performedBy,
      'USER_ROLE',
      roleId,
      { scope, centerId },
      ipAddress,
      userAgent,
    );
  }

  async logPermissionAssignment(
    userId: string,
    performedBy: string,
    permissionId: string,
    scope: string,
    centerId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logUserAction(
      'PERMISSION_ASSIGNMENT',
      userId,
      performedBy,
      'USER_PERMISSION',
      permissionId,
      { scope, centerId },
      ipAddress,
      userAgent,
    );
  }
}
