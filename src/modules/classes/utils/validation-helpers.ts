import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';

/**
 * Validation helper utilities for classes module.
 * Contains reusable validation patterns to reduce code duplication.
 */
export class ValidationHelpers {
  /**
   * Validates that a resource exists and belongs to the specified center.
   *
   * @param resource - The resource entity to validate (must have centerId property)
   * @param resourceId - The ID of the resource (for error messages)
   * @param centerId - The center ID to validate against
   * @param resourceName - The translation key for the resource name
   * @throws ResourceNotFoundException if resource doesn't exist or doesn't belong to center
   */
  static validateResourceExistsAndBelongsToCenter<T extends { centerId: string }>(
    resource: T | null,
    resourceId: string,
    centerId: string,
    resourceName: string,
  ): asserts resource is T {
    if (!resource) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: resourceName,
        identifier: 'ID',
        value: resourceId,
      });
    }

    if (resource.centerId !== centerId) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: resourceName,
        identifier: 'ID',
        value: resourceId,
      });
    }
  }
}

