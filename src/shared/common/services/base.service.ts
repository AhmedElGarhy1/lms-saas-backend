import { Injectable } from '@nestjs/common';

/**
 * Base service class providing common functionality for all services.
 * Contains reusable helper methods for common patterns.
 */
@Injectable()
export abstract class BaseService {
  constructor() {}
}
