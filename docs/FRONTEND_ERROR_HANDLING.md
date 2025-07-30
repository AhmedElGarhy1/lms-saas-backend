# Frontend Error Handling Guide

This document provides comprehensive guidance on how to handle the enhanced error responses from the LMS backend API.

## Enhanced Error Response Format

All API errors now follow this enhanced format:

```typescript
interface EnhancedErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
  method?: string;
  details?: ErrorDetail[];
  userMessage?: string;
  actionRequired?: string;
  retryable?: boolean;
}

interface ErrorDetail {
  field?: string;
  value?: any;
  message: string;
  code?: string;
  suggestion?: string;
}
```

## Frontend Implementation Examples

### 1. React Hook for Error Handling

```typescript
// hooks/useApiError.ts
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

interface ErrorDetail {
  field?: string;
  value?: any;
  message: string;
  code?: string;
  suggestion?: string;
}

interface EnhancedErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
  method?: string;
  details?: ErrorDetail[];
  userMessage?: string;
  actionRequired?: string;
  retryable?: boolean;
}

export const useApiError = () => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleError = useCallback((error: any) => {
    // Clear previous field errors
    setFieldErrors({});

    // Check if it's our enhanced error response
    if (error.response?.data && error.response.data.userMessage) {
      const errorData: EnhancedErrorResponse = error.response.data;

      // Show main error message to user
      toast.error(errorData.userMessage, {
        autoClose: errorData.retryable ? 5000 : false,
        closeButton: true,
      });

      // Handle field-specific errors
      if (errorData.details && errorData.details.length > 0) {
        const newFieldErrors: Record<string, string> = {};

        errorData.details.forEach((detail) => {
          if (detail.field) {
            newFieldErrors[detail.field] = detail.suggestion || detail.message;
          }
        });

        setFieldErrors(newFieldErrors);
      }

      // Show action required message if available
      if (errorData.actionRequired) {
        toast.info(errorData.actionRequired, {
          autoClose: 8000,
        });
      }

      return {
        userMessage: errorData.userMessage,
        actionRequired: errorData.actionRequired,
        fieldErrors: newFieldErrors,
        retryable: errorData.retryable,
        details: errorData.details,
      };
    }

    // Fallback for non-enhanced errors
    const fallbackMessage =
      error.response?.data?.message || error.message || 'An error occurred';
    toast.error(fallbackMessage);

    return {
      userMessage: fallbackMessage,
      retryable: true,
    };
  }, []);

  return { handleError, fieldErrors, setFieldErrors };
};
```

### 2. Form Component with Error Handling

```typescript
// components/UserForm.tsx
import React, { useState } from 'react';
import { useApiError } from '../hooks/useApiError';

interface UserFormProps {
  onSubmit: (data: any) => Promise<void>;
}

export const UserForm: React.FC<UserFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleError, fieldErrors, setFieldErrors } = useApiError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      await onSubmit(formData);
      // Success handling
    } catch (error) {
      handleError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldError = (fieldName: string) => fieldErrors[fieldName];

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={getFieldError('email') ? 'error' : ''}
        />
        {getFieldError('email') && (
          <span className="error-message">{getFieldError('email')}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={getFieldError('name') ? 'error' : ''}
        />
        {getFieldError('name') && (
          <span className="error-message">{getFieldError('name')}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className={getFieldError('password') ? 'error' : ''}
        />
        {getFieldError('password') && (
          <span className="error-message">{getFieldError('password')}</span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
};
```

### 3. API Service with Error Handling

```typescript
// services/api.ts
import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const errorResponse = error.response?.data;

    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        setTimeout(
          () => {
            // Retry the request
            return api.request(error.config!);
          },
          parseInt(retryAfter) * 1000,
        );
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

### 4. Error Alert Component

```typescript
// components/ErrorAlert.tsx
import React from 'react';
import { Alert, Button } from '@mui/material';

interface ErrorAlertProps {
  error: any;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onRetry, onDismiss }) => {
  if (!error) return null;

  const errorData = error.response?.data;
  const severity = errorData?.retryable ? 'warning' : 'error';

  return (
    <Alert
      severity={severity}
      action={
        <div>
          {errorData?.retryable && onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button color="inherit" size="small" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      }
    >
      <div>
        <strong>{errorData?.userMessage || error.message}</strong>
        {errorData?.actionRequired && (
          <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
            {errorData.actionRequired}
          </div>
        )}
      </div>
    </Alert>
  );
};
```

### 5. Field Error Display Component

```typescript
// components/FieldError.tsx
import React from 'react';
import { FormHelperText } from '@mui/material';

interface FieldErrorProps {
  error?: string;
  touched?: boolean;
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, touched }) => {
  if (!error || !touched) return null;

  return (
    <FormHelperText error>
      {error}
    </FormHelperText>
  );
};
```

## Error Code Handling

### Common Error Codes

```typescript
// constants/errorCodes.ts
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_FIELD: 'DUPLICATE_FIELD',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  AUTH_FAILED: 'AUTH_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RESOURCE_IN_USE: 'RESOURCE_IN_USE',
  INVALID_OPERATION: 'INVALID_OPERATION',
} as const;

export const getErrorIcon = (code: string) => {
  switch (code) {
    case ERROR_CODES.VALIDATION_ERROR:
      return '⚠️';
    case ERROR_CODES.DUPLICATE_FIELD:
      return '🔄';
    case ERROR_CODES.INSUFFICIENT_PERMISSIONS:
      return '🚫';
    case ERROR_CODES.RESOURCE_NOT_FOUND:
      return '🔍';
    case ERROR_CODES.AUTH_FAILED:
      return '🔐';
    case ERROR_CODES.RATE_LIMIT_EXCEEDED:
      return '⏰';
    default:
      return '❌';
  }
};
```

## Best Practices

### 1. User-Friendly Messages

- Always use `userMessage` for display to users
- Use `actionRequired` to guide users on next steps
- Provide specific suggestions for field errors

### 2. Retry Logic

- Check `retryable` flag before implementing retry logic
- Use exponential backoff for retryable errors
- Don't retry authentication or permission errors

### 3. Field-Level Errors

- Map field errors to form inputs
- Clear field errors when user starts typing
- Highlight fields with errors visually

### 4. Error Logging

- Log technical details for debugging
- Don't expose technical details to users
- Use error codes for analytics

### 5. Accessibility

- Ensure error messages are screen reader accessible
- Use proper ARIA labels for error states
- Provide keyboard navigation for error handling

## Example Usage in a Complete Component

```typescript
// components/UserManagement.tsx
import React, { useState } from 'react';
import { UserForm } from './UserForm';
import { ErrorAlert } from './ErrorAlert';
import { useApiError } from '../hooks/useApiError';
import api from '../services/api';

export const UserManagement: React.FC = () => {
  const [error, setError] = useState<any>(null);
  const { handleError } = useApiError();

  const handleCreateUser = async (userData: any) => {
    try {
      setError(null);
      await api.post('/users', userData);
      // Handle success
    } catch (err) {
      setError(err);
      handleError(err);
    }
  };

  const handleRetry = () => {
    setError(null);
    // Retry logic here
  };

  return (
    <div>
      <h1>Create User</h1>

      <ErrorAlert
        error={error}
        onRetry={handleRetry}
        onDismiss={() => setError(null)}
      />

      <UserForm onSubmit={handleCreateUser} />
    </div>
  );
};
```

This comprehensive error handling system provides:

- **User-friendly messages** that explain what went wrong
- **Actionable guidance** on how to fix the issue
- **Field-level error details** for form validation
- **Retry logic** for transient errors
- **Consistent error display** across the application
- **Accessibility support** for all users
