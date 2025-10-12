export class ControllerResponse<T = any> {
  data?: T;
  message: string;

  constructor(data: T | undefined, message: string) {
    this.data = data;
    this.message = message;
  }

  // Simple static methods
  static success<T>(data: T, message: string): ControllerResponse<T> {
    return new ControllerResponse(data, message);
  }

  static message(message: string): ControllerResponse<null> {
    return new ControllerResponse(null, message);
  }
}
