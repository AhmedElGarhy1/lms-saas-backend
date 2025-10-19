# Health Module

This module provides comprehensive health monitoring and performance tracking for the LMS application.

## 🏗️ Module Structure

```
src/modules/health/
├── health.module.ts                    # Main module definition
├── index.ts                           # Clean exports
├── controllers/
│   ├── health.controller.ts           # System health endpoints
│   └── performance.controller.ts      # Performance monitoring endpoints
├── services/
│   ├── health.service.ts              # System health checks
│   ├── database-performance.service.ts # Database performance monitoring
│   └── performance-alerts.service.ts  # Performance alerts system
└── interceptors/
    └── transaction-performance.interceptor.ts # Transaction monitoring
```

## 🚀 API Endpoints

All health-related endpoints are organized under the `health/` prefix for consistency.

### **System Health Endpoints**

#### **GET /health**

Get comprehensive system health status including database, memory, disk, CPU, cache, and external services.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "connections": {
        "active": 5,
        "idle": 10,
        "total": 15
      }
    },
    "memory": {
      "status": "healthy",
      "usage": {
        "total": 8589934592,
        "used": 4294967296,
        "free": 4294967296,
        "percentage": 50.0
      },
      "threshold": {
        "warning": 80,
        "critical": 95
      }
    },
    "disk": { ... },
    "cpu": { ... },
    "cache": { ... },
    "external": [ ... ]
  }
}
```

#### **GET /health/ready**

Kubernetes readiness probe endpoint. Returns 200 if the system is ready to accept traffic.

**Response:**

```json
{
  "status": "ready",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Performance Monitoring Endpoints**

All performance endpoints require authentication and appropriate permissions.

#### **GET /health/performance/health**

Get performance-specific health status with transaction and alert information.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": {
    "status": "connected",
    "averageQueryTime": "45ms",
    "slowQueries": 3,
    "totalQueries": 1250
  },
  "transactions": {
    "status": "operational",
    "totalMethods": 17,
    "errorRate": 0.02
  },
  "alerts": {
    "total": 5,
    "active": 1,
    "critical": 0,
    "warning": 1
  }
}
```

#### **GET /health/performance/database**

Get database performance metrics including query statistics and slow query information.

**Response:**

```json
{
  "totalQueries": 1250,
  "averageDuration": 45,
  "slowQueries": 3,
  "recentSlowQueries": [
    {
      "query": "SELECT * FROM users WHERE...",
      "duration": 1200,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### **GET /health/performance/transactions**

Get transaction performance metrics.

**Response:**

```json
{
  "activeTransactions": 0,
  "transactionDuration": 0
}
```

#### **GET /health/performance/alerts**

Get all active performance alerts.

**Response:**

```json
[
  {
    "id": "slow_transaction_AuthService_login",
    "type": "slow_transaction",
    "severity": "warning",
    "message": "Slow transaction detected: AuthService.login took 1500ms",
    "metrics": {
      "className": "AuthService",
      "methodName": "login",
      "duration": 1500,
      "threshold": 1000
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "resolved": false
  }
]
```

#### **GET /health/performance/stats**

Get comprehensive performance statistics including database, transactions, alerts, and system information.

**Response:**

```json
{
  "database": {
    "totalQueries": 1250,
    "averageDuration": 45,
    "slowQueries": 3,
    "recentSlowQueries": [...]
  },
  "transactions": {
    "AuthService.login": {
      "success": 150,
      "error": 2,
      "total": 152,
      "errorRate": 0.013
    },
    "UserService.createUserWithRole": {
      "success": 45,
      "error": 1,
      "total": 46,
      "errorRate": 0.022
    }
  },
  "alerts": {
    "total": 5,
    "active": 1,
    "critical": 0,
    "warning": 1
  },
  "system": {
    "memory": {
      "heapUsed": 45678912,
      "heapTotal": 67108864,
      "external": 1234567
    },
    "uptime": 3600,
    "nodeVersion": "v18.17.0"
  }
}
```

#### **POST /health/performance/alerts/resolve/:alertId**

Resolve a performance alert.

**Request Body:**

```json
{
  "alertId": "slow_transaction_AuthService_login"
}
```

**Response:**

```json
{
  "message": "Alert resolved successfully"
}
```

## 🔧 Usage Examples

### **Health Check Script**

```bash
#!/bin/bash

# Basic health check
curl -f http://localhost:3000/health || exit 1

# Readiness check
curl -f http://localhost:3000/health/ready || exit 1

# Performance health (requires authentication)
curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:3000/health/performance/health

# Get performance statistics
curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:3000/health/performance/stats
```

### **Monitoring Integration**

```typescript
// Example: Custom health check service
@Injectable()
export class CustomHealthService {
  constructor(
    private readonly healthService: HealthService,
    private readonly alertsService: PerformanceAlertsService,
  ) {}

  async getCustomHealthStatus() {
    const systemHealth = await this.healthService.getHealthStatus();
    const alerts = this.alertsService.getActiveAlerts();

    return {
      ...systemHealth,
      customChecks: {
        alerts: alerts.length,
        criticalAlerts: alerts.filter((a) => a.severity === 'critical').length,
      },
    };
  }
}
```

## 🚨 Alert System

The health module includes an intelligent alert system that monitors:

- **Slow Transactions** - Operations taking >1000ms
- **High Error Rates** - Methods with >10% error rate
- **Memory Usage** - System memory >80% usage
- **Connection Pool** - Database connections >90% usage

### **Alert Severity Levels**

- **Warning** - Non-critical issues that need attention (auto-resolve after 5 minutes)
- **Critical** - Serious issues requiring immediate action (manual resolution required)

### **Alert Events**

The system emits events for external monitoring integration:

```typescript
// Listen for performance alerts
this.eventEmitter.on('performance.alert', (alert) => {
  if (alert.severity === 'critical') {
    // Send to Slack, email, PagerDuty, etc.
    this.sendCriticalAlert(alert);
  }
});

// Listen for alert resolution
this.eventEmitter.on('performance.alert.resolved', (alert) => {
  this.logAlertResolution(alert);
});
```

## 📊 Performance Monitoring

The module automatically monitors all methods decorated with `@Transactional()`:

```typescript
@Transactional()
async createUserWithRole(dto: CreateUserWithRoleDto) {
  // This method is automatically monitored
  // Performance metrics are collected
  // Slow operations trigger alerts
  const user = await this.createUser(dto);
  const role = await this.assignRole(user.id, dto.roleId);
  return { user, role };
}
```

## 🔒 Security

- **Public Endpoints**: `/health` and `/health/ready` (no authentication required)
- **Protected Endpoints**: All `/health/performance/*` endpoints require authentication and appropriate permissions
- **Permission Required**: `PERMISSIONS.USER.READ` for performance monitoring endpoints

## 🚀 Production Deployment

### **Health Checks for Load Balancers**

```bash
# Use these endpoints for load balancer health checks
GET /health/ready  # Readiness probe
GET /health        # Liveness probe
```

### **Monitoring Integration**

```bash
# Prometheus metrics endpoint (if enabled)
GET /metrics

# Custom health endpoint for monitoring systems
GET /health/performance/stats
```

## 📈 Best Practices

1. **Use `/health/ready` for Kubernetes readiness probes**
2. **Use `/health` for liveness probes and general health monitoring**
3. **Monitor `/health/performance/alerts` for critical issues**
4. **Set up external monitoring to watch for alert events**
5. **Use performance statistics to optimize slow operations**
6. **Configure alert thresholds based on your application needs**

---

## 🎉 Summary

The Health Module provides:

- ✅ **Comprehensive system health monitoring**
- ✅ **Real-time performance tracking**
- ✅ **Intelligent alert system**
- ✅ **Consistent API structure under `/health/` prefix**
- ✅ **Production-ready monitoring capabilities**
- ✅ **Easy integration with external monitoring systems**

All endpoints are organized under the `health/` prefix for consistency and easy discovery! 🚀
