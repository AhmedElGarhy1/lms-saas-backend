import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../exceptions/custom.exceptions';
import { ActorUser } from '../types/actor-user.type';

/**
 * Base service class providing common functionality for all services.
 * Contains reusable helper methods for common patterns.
 */
@Injectable()
export abstract class BaseService {
  constructor() {}

  /**
   * Validates that a resource exists and belongs to the actor's center.
   * This is a common pattern used across multiple services for access control.
   *
   * @param resource - The resource entity to validate (must have centerId property)
   * @param resourceId - The ID of the resource (for error messages)
   * @param actor - The actor performing the action
   * @param resourceName - The translation key for the resource name (e.g., 't.common.resources.group')
   * @throws ResourceNotFoundException if resource doesn't exist or doesn't belong to actor's center
   */
  protected validateResourceAccess<T extends { centerId: string }>(
    resource: T | null,
    resourceId: string,
    actor: ActorUser,
    resourceName: string,
  ): asserts resource is T {
    if (!resource) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: resourceName,
        identifier: 'ID',
        value: resourceId,
      });
    }

    if (resource.centerId !== actor.centerId) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: resourceName,
        identifier: 'ID',
        value: resourceId,
      });
    }
  }
}
