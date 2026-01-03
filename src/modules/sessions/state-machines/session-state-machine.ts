import { Injectable } from '@nestjs/common';
import { SessionStatus } from '../enums/session-status.enum';
import { BaseTransition, BaseStateMachine } from '@/shared/state-machines';

export interface SessionTransition extends BaseTransition<SessionStatus> {
  // Session-specific extensions can be added here if needed
}

/**
 * Session State Machine Definition
 * Defines all valid session status transitions
 */
@Injectable()
export class SessionStateMachine extends BaseStateMachine<SessionStatus, SessionTransition> {
  private static readonly TRANSITIONS: SessionTransition[] = [
    // CHECK-IN TRANSITIONS
    {
      from: SessionStatus.SCHEDULED,
      to: SessionStatus.CHECKING_IN,
      businessLogic: 'checkInSession',
      description: 'Start check-in period for session',
      sideEffects: ['enrollment-finalization', 'attendance-tracking'],
    },

    // START SESSION TRANSITIONS
    {
      from: SessionStatus.CHECKING_IN,
      to: SessionStatus.CONDUCTING,
      businessLogic: 'startSession',
      description: 'Begin conducting the session',
    },

    // FINISH SESSION TRANSITIONS
    {
      from: SessionStatus.CONDUCTING,
      to: SessionStatus.FINISHED,
      businessLogic: 'finishSession',
      description: 'Mark session as completed',
      sideEffects: ['attendance-finalization', 'payment-processing'],
    },

    // CANCEL TRANSITIONS (from any active state)
    {
      from: SessionStatus.SCHEDULED,
      to: SessionStatus.CANCELED,
      businessLogic: 'cancelSession',
      description: 'Cancel scheduled session',
    },
    {
      from: SessionStatus.CHECKING_IN,
      to: SessionStatus.CANCELED,
      businessLogic: 'cancelSession',
      description: 'Cancel session during check-in',
    },
    {
      from: SessionStatus.CONDUCTING,
      to: SessionStatus.CANCELED,
      businessLogic: 'cancelSession',
      description: 'Cancel active session',
    },

    // RESCHEDULE TRANSITION
    {
      from: SessionStatus.CANCELED,
      to: SessionStatus.SCHEDULED,
      businessLogic: 'scheduleSession',
      description: 'Reschedule previously canceled session',
    },
  ];

  /**
   * Get all session transitions (required by base class)
   */
  protected getTransitions(): SessionTransition[] {
    return SessionStateMachine.TRANSITIONS;
  }

  /**
   * Execute business logic for transitions (required by base class)
   */
  protected async executeBusinessLogic(logic: string, context: any): Promise<any> {
    switch (logic) {
      case 'checkInSession':
        return this.checkInSession(context);
      case 'startSession':
        return this.startSession(context);
      case 'finishSession':
        return this.finishSession(context);
      case 'cancelSession':
        return this.cancelSession(context);
      case 'scheduleSession':
        return this.scheduleSession(context);
      default:
        throw new Error(`Unknown session business logic: ${logic}`);
    }
  }

  // Business logic methods (to be implemented by the session service)
  private async checkInSession(context: any): Promise<any> {
    throw new Error('checkInSession must be implemented by session service');
  }

  private async startSession(context: any): Promise<any> {
    throw new Error('startSession must be implemented by session service');
  }

  private async finishSession(context: any): Promise<any> {
    throw new Error('finishSession must be implemented by session service');
  }

  private async cancelSession(context: any): Promise<any> {
    throw new Error('cancelSession must be implemented by session service');
  }

  private async scheduleSession(context: any): Promise<any> {
    throw new Error('scheduleSession must be implemented by session service');
  }
}
