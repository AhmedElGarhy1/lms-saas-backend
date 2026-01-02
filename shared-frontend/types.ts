// Auto-generated types for frontend/mobile
export interface DomainError {
  errorCode: string;
  type: 'domain_error' | 'system_error';
  timestamp: string;
  metadata?: {
    field?: string;
    value?: unknown;
    phone?: string;
    email?: string;
    userId?: string;
    sessionId?: string;
    userMessage?: string;
    [key: string]: any;
  };
}

export interface SystemError {
  errorCode: string;
  type: 'system_error';
  timestamp: string;
  metadata?: {
    component?: string;
    operation?: string;
    retryable?: boolean;
    [key: string]: any;
  };
}
