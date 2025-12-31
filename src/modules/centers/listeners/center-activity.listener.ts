import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CenterEvents } from '@/shared/events/center.events.enum';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
  DeleteCenterEvent,
  RestoreCenterEvent,
  CenterExportedEvent,
} from '../events/center.events';

/**
 * Domain Event Listener for Center Activity Logging
 *
 * Handles side effects (activity logging) for center domain events.
 * This listener can coexist with other domain event listeners.
 */
@Injectable()
export class CenterActivityListener {
  constructor() {}

  @OnEvent(CenterEvents.CREATED)
  async handleCenterCreated(event: CreateCenterEvent) {
    // Activity logging removed
  }

  @OnEvent(CenterEvents.UPDATED)
  async handleCenterUpdated(event: UpdateCenterEvent) {
    // Activity logging removed
  }

  @OnEvent(CenterEvents.DELETED)
  async handleCenterDeleted(event: DeleteCenterEvent) {
    // Activity logging removed
  }

  @OnEvent(CenterEvents.RESTORED)
  async handleCenterRestored(event: RestoreCenterEvent) {
    // Activity logging removed
  }

  @OnEvent(CenterEvents.EXPORTED)
  async handleCenterExported(event: CenterExportedEvent) {
    // Activity logging removed
  }
}
