export interface ErrorDetail {
  field?: string;
  value?: any;
  message?: string;
  code?: string;
  suggestion?: string;
  [key: string]: any; // Allow additional properties for minimal data
}

export interface StandardizedErrorResponse {
  success: false;
  error: {
    code: string;
    details?: any[];
    // Development mode debugging information
    stack?: string[];
    debug?: {
      timestamp: string;
      environment: string;
      requestId?: string;
      correlationId?: string;
    };
  };
}

export interface EnhancedErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
  method?: string;
  details?: ErrorDetail[] | Record<string, any>;
}
