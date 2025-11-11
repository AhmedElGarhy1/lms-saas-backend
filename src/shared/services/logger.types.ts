/**
 * Logger types and interfaces
 */

export interface LogContext {
  [key: string]: any;
}

export interface LogMetadata extends LogContext {
  timestamp?: string;
  requestId?: string;
  userId?: string;
  centerId?: string;
  service?: string;
  [key: string]: any;
}
