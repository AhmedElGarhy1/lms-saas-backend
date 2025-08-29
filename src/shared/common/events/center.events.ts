import { EventEmitter2 } from 'eventemitter2';

export interface CenterCreatedEvent {
  centerId: string;
  centerName: string;
  createdBy: string;
  adminInfo: {
    email: string;
    name: string;
    password: string;
  };
}

export interface CenterAdminCreatedEvent {
  centerId: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
}

export interface CenterUserAssignedEvent {
  centerId: string;
  userId: string;
  assignedBy: string;
  roleType?: string;
}

export interface CenterAdminAssignedEvent {
  centerId: string;
  adminId: string;
  assignedBy: string;
}

export interface CenterUpdatedEvent {
  centerId: string;
  centerName: string;
  updatedBy: string;
  changes: Record<string, any>;
}

export interface CenterActivatedEvent {
  centerId: string;
  centerName: string;
  activatedBy: string;
  isActive: boolean;
}

export class CenterEventEmitter extends EventEmitter2 {
  // Center creation events
  emitCenterCreated(event: CenterCreatedEvent): void {
    this.emit('center.created', event);
  }

  emitCenterAdminCreated(event: CenterAdminCreatedEvent): void {
    this.emit('center.admin.created', event);
  }

  // Center user management events
  emitCenterUserAssigned(event: CenterUserAssignedEvent): void {
    this.emit('center.user.assigned', event);
  }

  emitCenterAdminAssigned(event: CenterAdminAssignedEvent): void {
    this.emit('center.admin.assigned', event);
  }

  // Center management events
  emitCenterUpdated(event: CenterUpdatedEvent): void {
    this.emit('center.updated', event);
  }

  emitCenterActivated(event: CenterActivatedEvent): void {
    this.emit('center.activated', event);
  }

  // Event listeners
  onCenterCreated(callback: (event: CenterCreatedEvent) => void): void {
    this.on('center.created', callback);
  }

  onCenterAdminCreated(
    callback: (event: CenterAdminCreatedEvent) => void,
  ): void {
    this.on('center.admin.created', callback);
  }

  onCenterUserAssigned(
    callback: (event: CenterUserAssignedEvent) => void,
  ): void {
    this.on('center.user.assigned', callback);
  }

  onCenterAdminAssigned(
    callback: (event: CenterAdminAssignedEvent) => void,
  ): void {
    this.on('center.admin.assigned', callback);
  }

  onCenterUpdated(callback: (event: CenterUpdatedEvent) => void): void {
    this.on('center.updated', callback);
  }

  onCenterActivated(callback: (event: CenterActivatedEvent) => void): void {
    this.on('center.activated', callback);
  }
}
