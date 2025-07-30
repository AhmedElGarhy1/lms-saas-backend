export interface ErrorDetail {
  field?: string;
  value?: any;
  message: string;
  code?: string;
  suggestion?: string;
}

export interface EnhancedErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
  method?: string;
  details?: ErrorDetail[] | Record<string, any>;
  userMessage?: string;
  actionRequired?: string;
  retryable?: boolean;
}
