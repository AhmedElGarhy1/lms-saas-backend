export class ControllerResponse<T = any> {
  data?: T;

  constructor(data: T | undefined) {
    this.data = data;
  }

  /**
   * Create success response
   */
  static success<T>(data: T): ControllerResponse<T> {
    return new ControllerResponse(data);
  }
}
