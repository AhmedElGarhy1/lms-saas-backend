# Quick Reference Guide - Phase 3 Features

## 🚀 **New Features Overview**

### 1. **Enhanced Repository Methods**

#### **findWithOptions()**

```typescript
// Advanced query with caching and relations
const users = await userRepository.findWithOptions({
  select: ['id', 'name', 'email'],
  relations: ['profile', 'roles'],
  where: { isActive: true, roleType: 'ADMIN' },
  order: { createdAt: 'DESC' },
  cache: 60000, // 1 minute cache
  lock: 'pessimistic_read',
});
```

#### **bulkInsert()**

```typescript
// Batch insert with progress tracking
await userRepository.bulkInsert(users, {
  batchSize: 100,
  onProgress: (processed, total) => {
    console.log(`Processed ${processed}/${total} users`);
  },
});
```

#### **Complex Where Conditions**

```typescript
// Advanced filtering
const users = await userRepository.findWithOptions({
  where: {
    name: { $like: '%john%' },
    age: { $gte: 18, $lte: 65 },
    status: ['active', 'pending'],
    deletedAt: null,
  },
});
```

### 2. **Rate Limiting**

#### **Basic Usage**

```typescript
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  @Post('login')
  @RateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 })
  async login() {
    // Login logic
  }
}
```

#### **Default Protection**

- **Login endpoints**: 5 requests per 15 minutes
- **Signup endpoints**: 3 requests per hour
- **Password reset**: 3 requests per hour

### 3. **Health Monitoring**

#### **Health Endpoints**

```bash
# Simple health check
GET /health/simple

# Full system health
GET /health

# Kubernetes probes
GET /health/ready  # Readiness probe
GET /health/live   # Liveness probe

# Component health
GET /health/database
GET /health/system
```

#### **Health Response Example**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "connections": { "active": 5, "idle": 10, "total": 15 }
    },
    "memory": {
      "status": "healthy",
      "usage": {
        "total": 8589934592,
        "used": 4294967296,
        "free": 4294967296,
        "percentage": 50
      },
      "threshold": { "warning": 80, "critical": 95 }
    }
  }
}
```

## 🔧 **Configuration**

### **Environment Variables**

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Health Check
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=lms_backend
```

### **Repository Configuration**

```typescript
// Cache configuration
const cacheOptions = {
  cache: 60000, // 1 minute
  lock: 'pessimistic_read',
};

// Bulk operation configuration
const bulkOptions = {
  batchSize: 100,
  onProgress: (processed, total) => {
    console.log(`Processed ${processed}/${total}`);
  },
};
```

## 📊 **Performance Monitoring**

### **Query Performance**

```typescript
// Monitor query execution
const startTime = Date.now();
const result = await repository.findWithOptions(options);
const duration = Date.now() - startTime;

console.log(`Query executed in ${duration}ms`);
```

### **Bulk Operation Progress**

```typescript
// Track bulk operation progress
await repository.bulkInsert(data, {
  batchSize: 100,
  onProgress: (processed, total) => {
    const percentage = Math.round((processed / total) * 100);
    console.log(`Progress: ${percentage}% (${processed}/${total})`);
  },
});
```

## 🛡️ **Security Features**

### **Rate Limiting Configuration**

```typescript
// Method-level rate limiting
@RateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 })
async sensitiveOperation() {
  // Protected operation
}

// Class-level rate limiting
@RateLimit({ windowMs: 60 * 1000, maxRequests: 100 })
@Controller('api')
export class ApiController {
  // All methods in this controller are rate limited
}
```

### **Security Logging**

```typescript
// Rate limit events are automatically logged
// Check logs for security events
// Example log entry:
// "Rate limit exceeded: { ip: '192.168.1.1', path: '/auth/login', count: 5 }"
```

## 🚀 **Deployment**

### **Docker**

```bash
# Build and run
docker build -t lms-backend .
docker run -p 3000:3000 lms-backend

# Health check
curl http://localhost:3000/health/live
```

### **Kubernetes**

```yaml
# Health probes
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### **PM2**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'lms-backend',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Rate Limiting Too Strict**

   ```typescript
   // Adjust limits in environment variables
   RATE_LIMIT_MAX_REQUESTS = 200;
   RATE_LIMIT_WINDOW_MS = 1800000; // 30 minutes
   ```

2. **Health Check Failures**

   ```bash
   # Check database connectivity
   curl http://localhost:3000/health/database

   # Check system resources
   curl http://localhost:3000/health/system
   ```

3. **Performance Issues**
   ```typescript
   // Enable query logging
   // Check repository logs for slow queries
   // Use caching for frequently accessed data
   ```

### **Debug Mode**

```bash
# Enable debug logging
NODE_ENV=development DEBUG=* npm run start:dev

# Check specific health components
curl http://localhost:3000/health/database
curl http://localhost:3000/health/system
```

## 📈 **Best Practices**

### **Repository Usage**

```typescript
// Use caching for frequently accessed data
const cachedUsers = await userRepository.findWithOptions({
  where: { isActive: true },
  cache: 300000, // 5 minutes
});

// Use bulk operations for large datasets
await userRepository.bulkUpdate(
  { isActive: false },
  { status: 'inactive' },
  { batchSize: 50 },
);

// Monitor query performance
const startTime = Date.now();
const result = await repository.findWithOptions(options);
console.log(`Query took ${Date.now() - startTime}ms`);
```

### **Rate Limiting**

```typescript
// Use appropriate limits for different endpoints
@RateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 }) // Sensitive
@RateLimit({ windowMs: 60 * 1000, maxRequests: 100 })    // General
@RateLimit({ windowMs: 60 * 1000, maxRequests: 1000 })   // Public
```

### **Health Monitoring**

```typescript
// Set up monitoring alerts
// Monitor health endpoint responses
// Track performance metrics
// Set up automated health checks
```

---

**This quick reference covers the essential Phase 3 features. For detailed documentation, see the full documentation files.** 📚
