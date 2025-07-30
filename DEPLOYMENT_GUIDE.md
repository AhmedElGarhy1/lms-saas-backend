# LMS Backend Deployment Guide

## 🚀 Overview

This guide provides comprehensive instructions for deploying the enhanced LMS backend with advanced features including rate limiting, health monitoring, and optimized database operations.

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for distributed caching)
- Docker & Docker Compose (for containerized deployment)

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=lms_backend

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=production
PORT=3000
API_PREFIX=api

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# Email Configuration (if using email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health/live || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health/live']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: lms_backend
      POSTGRES_USER: lms_user
      POSTGRES_PASSWORD: lms_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    restart: unless-stopped

volumes:
  postgres_data:
```

## 🚀 Production Deployment

### 1. Database Setup

```sql
-- Create database and user
CREATE DATABASE lms_backend;
CREATE USER lms_user WITH PASSWORD 'lms_password';
GRANT ALL PRIVILEGES ON DATABASE lms_backend TO lms_user;

-- Connect to the database
\c lms_backend

-- Run migrations
-- The application will automatically run migrations on startup
```

### 2. Application Deployment

```bash
# Clone the repository
git clone <your-repo-url>
cd lms-backend

# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Start the application
npm run start:prod
```

### 3. Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'lms-backend',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## 🔍 Health Monitoring

### Health Check Endpoints

The application provides comprehensive health monitoring:

- **`GET /health`** - Full system health status
- **`GET /health/simple`** - Simple health check for load balancers
- **`GET /health/ready`** - Kubernetes readiness probe
- **`GET /health/live`** - Kubernetes liveness probe
- **`GET /health/database`** - Database-specific health
- **`GET /health/system`** - System resources health

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lms-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lms-backend
  template:
    metadata:
      labels:
        app: lms-backend
    spec:
      containers:
        - name: lms-backend
          image: your-registry/lms-backend:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: DATABASE_HOST
              valueFrom:
                secretKeyRef:
                  name: lms-secrets
                  key: database-host
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
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
---
apiVersion: v1
kind: Service
metadata:
  name: lms-backend-service
spec:
  selector:
    app: lms-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

## 🔒 Security Configuration

### Rate Limiting

The application includes built-in rate limiting:

- **Default**: 100 requests per 15 minutes per IP
- **Sensitive endpoints**: 5 requests per 15 minutes (login, signup, password reset)
- **Configurable**: Per-endpoint and per-user rate limiting

### Security Headers

The application uses Helmet.js for security headers:

- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security

### CORS Configuration

```typescript
// Configure CORS for your domains
app.enableCors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true,
});
```

## 📊 Monitoring & Logging

### Application Logs

The application uses Winston for structured logging:

```typescript
// Log levels: error, warn, info, debug
// Logs include: timestamp, level, message, context, metadata
```

### Performance Monitoring

The enhanced repository includes performance tracking:

- Query execution time
- Result counts
- Cache hit rates
- Bulk operation progress

### Metrics Collection

Consider integrating with monitoring tools:

- **Prometheus**: For metrics collection
- **Grafana**: For visualization
- **ELK Stack**: For log aggregation

## 🔧 Configuration Management

### Environment-Specific Configs

```typescript
// config/app.config.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
});
```

## 🚀 Scaling Considerations

### Horizontal Scaling

- Use load balancers (nginx, HAProxy)
- Implement session management with Redis
- Use database connection pooling
- Consider read replicas for database

### Vertical Scaling

- Monitor resource usage
- Adjust PM2 instances based on CPU cores
- Optimize database queries
- Use caching strategies

## 🔄 Backup & Recovery

### Database Backups

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U lms_user lms_backend > backup_$DATE.sql
```

### Application Backups

- Version control for code
- Environment configuration backups
- SSL certificates and secrets
- Database migration scripts

## 📈 Performance Optimization

### Database Optimization

- Use the enhanced repository methods for optimized queries
- Implement query caching where appropriate
- Use bulk operations for large datasets
- Monitor slow queries and optimize indexes

### Application Optimization

- Enable compression (gzip)
- Use CDN for static assets
- Implement response caching
- Monitor memory usage and garbage collection

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check database credentials
   - Verify network connectivity
   - Check connection pool settings

2. **Rate Limiting Issues**
   - Monitor rate limit logs
   - Adjust limits if needed
   - Check for proxy/load balancer IP forwarding

3. **Health Check Failures**
   - Check application logs
   - Verify database connectivity
   - Monitor system resources

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development DEBUG=* npm run start:dev
```

## 📞 Support

For deployment issues or questions:

1. Check the application logs
2. Review the health check endpoints
3. Verify environment configuration
4. Check database connectivity
5. Monitor system resources

---

**The LMS backend is now production-ready with enterprise-level features for security, performance, monitoring, and scalability!** 🚀
