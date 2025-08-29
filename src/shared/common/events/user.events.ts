import { EventEmitter2 } from 'eventemitter2';

export interface UserCreatedEvent {
  userId: string;
  userEmail: string;
  userName: string;
  createdBy?: string;
  centerId?: string;
  roleId?: string;
}

export interface UserProfileCreatedEvent {
  userId: string;
  profileType: string;
  profileData: any;
}

export interface UserActivatedEvent {
  userId: string;
  activatedBy: string;
  isActive: boolean;
}

export interface UserPasswordChangedEvent {
  userId: string;
  changedBy: string;
}

export interface UserLoginEvent {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserLogoutEvent {
  userId: string;
}

export class UserEventEmitter extends EventEmitter2 {
  // User creation events
  emitUserCreated(event: UserCreatedEvent): void {
    this.emit('user.created', event);
  }

  emitUserProfileCreated(event: UserProfileCreatedEvent): void {
    this.emit('user.profile.created', event);
  }

  emitUserActivated(event: UserActivatedEvent): void {
    this.emit('user.activated', event);
  }

  emitUserPasswordChanged(event: UserPasswordChangedEvent): void {
    this.emit('user.password.changed', event);
  }

  emitUserLogin(event: UserLoginEvent): void {
    this.emit('user.login', event);
  }

  emitUserLogout(event: UserLogoutEvent): void {
    this.emit('user.logout', event);
  }

  // Event listeners
  onUserCreated(callback: (event: UserCreatedEvent) => void): void {
    this.on('user.created', callback);
  }

  onUserProfileCreated(
    callback: (event: UserProfileCreatedEvent) => void,
  ): void {
    this.on('user.profile.created', callback);
  }

  onUserActivated(callback: (event: UserActivatedEvent) => void): void {
    this.on('user.activated', callback);
  }

  onUserPasswordChanged(
    callback: (event: UserPasswordChangedEvent) => void,
  ): void {
    this.on('user.password.changed', callback);
  }

  onUserLogin(callback: (event: UserLoginEvent) => void): void {
    this.on('user.login', callback);
  }

  onUserLogout(callback: (event: UserLogoutEvent) => void): void {
    this.on('user.logout', callback);
  }
}
