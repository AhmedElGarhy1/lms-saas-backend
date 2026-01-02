import { ClassesErrors } from '../exceptions/classes.errors';

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
   * @throws ClassesErrors.resourceAccessDenied() if resource doesn't exist or doesn't belong to center
   */
  static validateResourceExistsAndBelongsToCenter<
    T extends { centerId: string },
  >(
    resource: T | null,
    resourceId: string,
    centerId: string,
    resourceName: string,
  ): asserts resource is T {
    if (!resource) {
      throw ClassesErrors.resourceAccessDenied();
    }

    if (resource.centerId !== centerId) {
      throw ClassesErrors.resourceAccessDenied();
    }
  }
}
