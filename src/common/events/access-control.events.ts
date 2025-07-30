import { EventEmitter2 } from 'eventemitter2';

export interface PermissionGrantedEvent {
  userId: string;
  permissionId: string;
  permissionAction: string;
  scopeType: string;
  centerId?: string;
  grantedBy: string;
}

export interface PermissionRevokedEvent {
  userId: string;
  permissionId: string;
  permissionAction: string;
  scopeType: string;
  centerId?: string;
  revokedBy: string;
}

export interface UserAccessGrantedEvent {
  granterUserId: string;
  targetUserId: string;
  centerId?: string;
  grantedBy: string;
}

export interface UserAccessRevokedEvent {
  granterUserId: string;
  targetUserId: string;
  centerId?: string;
  revokedBy: string;
}

export interface CenterAccessGrantedEvent {
  userId: string;
  centerId: string;
  grantedBy: string;
}

export interface CenterAccessRevokedEvent {
  userId: string;
  centerId: string;
  revokedBy: string;
}

export class AccessControlEventEmitter extends EventEmitter2 {
  // Permission events
  emitPermissionGranted(event: PermissionGrantedEvent): void {
    this.emit('permission.granted', event);
  }

  emitPermissionRevoked(event: PermissionRevokedEvent): void {
    this.emit('permission.revoked', event);
  }

  // User access events
  emitUserAccessGranted(event: UserAccessGrantedEvent): void {
    this.emit('user.access.granted', event);
  }

  emitUserAccessRevoked(event: UserAccessRevokedEvent): void {
    this.emit('user.access.revoked', event);
  }

  // Center access events
  emitCenterAccessGranted(event: CenterAccessGrantedEvent): void {
    this.emit('center.access.granted', event);
  }

  emitCenterAccessRevoked(event: CenterAccessRevokedEvent): void {
    this.emit('center.access.revoked', event);
  }

  // Event listeners
  onPermissionGranted(callback: (event: PermissionGrantedEvent) => void): void {
    this.on('permission.granted', callback);
  }

  onPermissionRevoked(callback: (event: PermissionRevokedEvent) => void): void {
    this.on('permission.revoked', callback);
  }

  onUserAccessGranted(callback: (event: UserAccessGrantedEvent) => void): void {
    this.on('user.access.granted', callback);
  }

  onUserAccessRevoked(callback: (event: UserAccessRevokedEvent) => void): void {
    this.on('user.access.revoked', callback);
  }

  onCenterAccessGranted(
    callback: (event: CenterAccessGrantedEvent) => void,
  ): void {
    this.on('center.access.granted', callback);
  }

  onCenterAccessRevoked(
    callback: (event: CenterAccessRevokedEvent) => void,
  ): void {
    this.on('center.access.revoked', callback);
  }
}
