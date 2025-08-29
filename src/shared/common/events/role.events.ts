import { EventEmitter2 } from 'eventemitter2';

export interface RoleCreatedEvent {
  roleId: string;
  roleName: string;
  roleType: string;
  createdBy: string;
}

export interface RoleAssignedEvent {
  userId: string;
  roleId: string;
  roleType: string;
  centerId?: string;
  assignedBy: string;
}

export interface RoleRemovedEvent {
  userId: string;
  roleId: string;
  roleType: string;
  centerId?: string;
  removedBy: string;
}

export interface RoleUpdatedEvent {
  roleId: string;
  roleName: string;
  roleType: string;
  updatedBy: string;
  changes: Record<string, any>;
}

export class RoleEventEmitter extends EventEmitter2 {
  // Role management events
  emitRoleCreated(event: RoleCreatedEvent): void {
    this.emit('role.created', event);
  }

  emitRoleAssigned(event: RoleAssignedEvent): void {
    this.emit('role.assigned', event);
  }

  emitRoleRemoved(event: RoleRemovedEvent): void {
    this.emit('role.removed', event);
  }

  emitRoleUpdated(event: RoleUpdatedEvent): void {
    this.emit('role.updated', event);
  }

  // Event listeners
  onRoleCreated(callback: (event: RoleCreatedEvent) => void): void {
    this.on('role.created', callback);
  }

  onRoleAssigned(callback: (event: RoleAssignedEvent) => void): void {
    this.on('role.assigned', callback);
  }

  onRoleRemoved(callback: (event: RoleRemovedEvent) => void): void {
    this.on('role.removed', callback);
  }

  onRoleUpdated(callback: (event: RoleUpdatedEvent) => void): void {
    this.on('role.updated', callback);
  }
}
