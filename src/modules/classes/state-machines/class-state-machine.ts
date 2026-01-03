import { Injectable } from '@nestjs/common';
import { ClassStatus } from '../enums/class-status.enum';
import { BaseTransition, BaseStateMachine } from '@/shared/state-machines';

export interface ClassTransition extends BaseTransition<ClassStatus> {
  // Class-specific extensions can be added here if needed
}

/**
 * Class State Machine Definition
 * Defines all valid class status transitions
 */
@Injectable()
export class ClassStateMachine extends BaseStateMachine<
  ClassStatus,
  ClassTransition
> {
  private static readonly TRANSITIONS: ClassTransition[] = [
    // PENDING_TEACHER_APPROVAL transitions
    {
      from: ClassStatus.PENDING_TEACHER_APPROVAL,
      to: ClassStatus.NOT_STARTED,
      businessLogic: 'approveByTeacher',
      description: 'Teacher approves the class request',
    },
    {
      from: ClassStatus.PENDING_TEACHER_APPROVAL,
      to: ClassStatus.CANCELED,
      businessLogic: 'rejectByTeacher',
      description: 'Teacher rejects the class request',
    },

    // NOT_STARTED transitions
    {
      from: ClassStatus.NOT_STARTED,
      to: ClassStatus.ACTIVE,
      businessLogic: 'activateClass',
      description:
        'Class becomes active (start date reached or manual activation)',
      sideEffects: ['schedule-sessions'],
    },
    {
      from: ClassStatus.NOT_STARTED,
      to: ClassStatus.CANCELED,
      businessLogic: 'cancelClass',
      description: 'Cancel class before it starts',
    },

    // ACTIVE transitions
    {
      from: ClassStatus.ACTIVE,
      to: ClassStatus.PAUSED,
      businessLogic: 'pauseClass',
      description: 'Temporarily pause active class',
      sideEffects: ['cancel-pending-sessions'],
    },
    {
      from: ClassStatus.ACTIVE,
      to: ClassStatus.FINISHED,
      businessLogic: 'finishClass',
      description: 'Mark class as completed (end date reached or manual)',
      sideEffects: ['finalize-sessions', 'generate-reports'],
    },
    {
      from: ClassStatus.ACTIVE,
      to: ClassStatus.CANCELED,
      businessLogic: 'cancelClass',
      description: 'Cancel active class',
      sideEffects: ['cancel-all-sessions', 'refund-students'],
    },

    // PAUSED transitions
    {
      from: ClassStatus.PAUSED,
      to: ClassStatus.ACTIVE,
      businessLogic: 'resumeClass',
      description: 'Resume paused class',
      sideEffects: ['reschedule-sessions'],
    },
    {
      from: ClassStatus.PAUSED,
      to: ClassStatus.CANCELED,
      businessLogic: 'cancelClass',
      description: 'Cancel paused class',
      sideEffects: ['cancel-remaining-sessions'],
    },

    // FINISHED transitions (limited reactivation)
    {
      from: ClassStatus.FINISHED,
      to: ClassStatus.ACTIVE,
      businessLogic: 'reactivateClass',
      description: 'Reactivate finished class within grace period',
      sideEffects: ['reschedule-sessions'],
    },

    // CANCELED transitions (limited reactivation)
    {
      from: ClassStatus.CANCELED,
      to: ClassStatus.ACTIVE,
      businessLogic: 'reactivateClass',
      description: 'Reactivate canceled class within grace period',
      sideEffects: ['reschedule-sessions'],
    },
  ];

  /**
   * Get all class transitions (required by base class)
   */
  protected getTransitions(): ClassTransition[] {
    return ClassStateMachine.TRANSITIONS;
  }

  /**
   * Execute business logic for transitions (required by base class)
   */
  protected async executeBusinessLogic(
    logic: string,
    context: any,
  ): Promise<any> {
    switch (logic) {
      case 'approveByTeacher':
        return this.approveByTeacher(context);
      case 'rejectByTeacher':
        return this.rejectByTeacher(context);
      case 'activateClass':
        return this.activateClass(context);
      case 'pauseClass':
        return this.pauseClass(context);
      case 'finishClass':
        return this.finishClass(context);
      case 'cancelClass':
        return this.cancelClass(context);
      case 'resumeClass':
        return this.resumeClass(context);
      case 'reactivateClass':
        return this.reactivateClass(context);
      default:
        throw new Error(`Unknown class business logic: ${logic}`);
    }
  }

  // Business logic methods (to be implemented by the class service)
  private async approveByTeacher(context: any): Promise<any> {
    throw new Error('approveByTeacher must be implemented by class service');
  }

  private async rejectByTeacher(context: any): Promise<any> {
    throw new Error('rejectByTeacher must be implemented by class service');
  }

  private async activateClass(context: any): Promise<any> {
    throw new Error('activateClass must be implemented by class service');
  }

  private async pauseClass(context: any): Promise<any> {
    throw new Error('pauseClass must be implemented by class service');
  }

  private async finishClass(context: any): Promise<any> {
    throw new Error('finishClass must be implemented by class service');
  }

  private async cancelClass(context: any): Promise<any> {
    throw new Error('cancelClass must be implemented by class service');
  }

  private async resumeClass(context: any): Promise<any> {
    throw new Error('resumeClass must be implemented by class service');
  }

  private async reactivateClass(context: any): Promise<any> {
    throw new Error('reactivateClass must be implemented by class service');
  }
}
