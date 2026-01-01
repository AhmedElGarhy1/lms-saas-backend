export class ControllerResponse<T = any> {
  data?: T;
  message: string;

  constructor(data: T | undefined, message: string) {
    this.data = data;
    this.message = message;
  }

  /**
   * Create success response
   */
  static success<T>(data: T, message: string): ControllerResponse<T> {
    return new ControllerResponse(data, message);
  }

  /**
   * Create message-only response
   */
  static message(message: string): ControllerResponse<null> {
    return new ControllerResponse(null, message);
  }

  /**
   * Create error response
   */
  static error(message: string): ControllerResponse<null> {
    return new ControllerResponse(null, message);
  }
}
