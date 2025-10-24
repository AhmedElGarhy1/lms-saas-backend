# 🚀 Transaction Management Guide

## Overview

This guide covers the comprehensive transaction management system implemented in your LMS backend. The system ensures data consistency and provides advanced performance monitoring.

## 🎯 Transaction Implementation Status

### ✅ **COMPLETED - 17 Methods**

| Priority   | Category             | Methods   | Status      |
| ---------- | -------------------- | --------- | ----------- |
| **HIGH**   | Critical Operations  | 6 methods | ✅ Complete |
| **MEDIUM** | Authentication Flows | 6 methods | ✅ Complete |
| **LOW**    | Token Management     | 5 methods | ✅ Complete |

## 📋 **Implemented Methods**

### **HIGH PRIORITY (Critical Operations)**

1. **AuthService.login()** - User authentication with token creation
2. **UserService.createUserWithRole()** - User creation with role assignment
3. **UserService.updateUser()** - User profile updates
4. **CentersService.createCenter()** - Center creation with owner setup
5. **RolesRepository.updateRole()** - Role permission updates
6. **UserRoleRepository.assignUserRole()** - Role assignment to users

### **MEDIUM PRIORITY (Authentication Flows)**

7. **AuthService.verify2FA()** - Two-factor authentication verification
8. **AuthService.setupTwoFactor()** - 2FA setup process
9. **AuthService.enableTwoFactor()** - 2FA enablement
10. **AuthService.disableTwoFactor()** - 2FA disablement
11. **PasswordResetService.resetPassword()** - Password reset process
12. **EmailVerificationService.verifyEmail()** - Email verification

### **LOW PRIORITY (Token Management)**

13. **RefreshTokenService.refreshAccessToken()** - Token rotation
14. **AuthService.logout()** - User logout with token cleanup
15. **BaseRepository.bulkInsert()** - Bulk insert operations
16. **BaseRepository.bulkUpdate()** - Bulk update operations
17. **BaseRepository.bulkDelete()** - Bulk delete operations

## 🔧 **Usage Patterns**

### **Basic Transaction Usage**

```typescript
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class YourService {
  @Transactional()
  async yourMethod() {
    // Multiple database operations
    // If any fails, all are rolled back
    const user = await this.createUser();
    const profile = await this.createProfile(user.id);
    return { user, profile };
  }
}
```

### **Repository Pattern with Transactions**

With the new `@nestjs-cls/transactional` system, repositories must use the `TransactionHost` pattern:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(userRepository, logger, txHost);
  }

  async findByEmail(email: string): Promise<User | null> {
    // getRepository() returns transactional repository when in a transaction
    return await this.getRepository().findOne({ where: { email } });
  }
}
```

## 📊 **Performance Monitoring**

### **Real-time Monitoring**

Your application now includes comprehensive performance monitoring:

#### **1. Transaction Performance**

- Automatic tracking of all transaction durations
- Slow transaction detection (>1000ms)
- Error rate monitoring
- Success/failure statistics

#### **2. Database Performance**

- Query execution time tracking
- Slow query detection
- Query sanitization for security
- Performance statistics

#### **3. System Health**

- Memory usage monitoring
- Connection pool monitoring
- Overall system health status

### **API Endpoints**

#### **Health Check**

```bash
GET /performance/health
```

Returns overall system health status.

#### **Performance Statistics**

```bash
GET /performance/stats
```

Returns comprehensive performance metrics.

#### **Active Alerts**

```bash
GET /performance/alerts
```

Returns all active performance alerts.

#### **Database Performance**

```bash
GET /performance/database
```

Returns database-specific performance metrics.

## 🚨 **Alert System**

### **Alert Types**

1. **Slow Transactions** - Operations taking >1000ms
2. **High Error Rates** - Methods with >10% error rate
3. **Memory Usage** - System memory >80% usage
4. **Connection Pool** - Database connections >90% usage

### **Alert Severity**

- **Warning** - Non-critical issues that need attention
- **Critical** - Serious issues requiring immediate action

### **Alert Resolution**

- Warnings auto-resolve after 5 minutes
- Critical alerts require manual resolution
- All alerts are logged and can be monitored via API

## 🔍 **Logging and Monitoring**

### **Transaction Logs**

```
[TransactionPerformanceInterceptor] Transaction completed: AuthService.login (45ms)
[TransactionPerformanceInterceptor] SLOW TRANSACTION DETECTED: UserService.createUserWithRole took 1200ms
```

### **Performance Alerts**

```
[PerformanceAlertsService] WARNING: Slow transaction detected: AuthService.login took 1500ms
[PerformanceAlertsService] CRITICAL ALERT: High error rate detected: UserService.updateUser has 25% error rate
```

## ⚙️ **Configuration**

### **Environment Variables**

```bash
# Transaction thresholds
SLOW_TRANSACTION_THRESHOLD=1000
CRITICAL_TRANSACTION_THRESHOLD=5000

# Error rate thresholds
ERROR_RATE_WARNING=0.1
ERROR_RATE_CRITICAL=0.2

# Memory thresholds
MEMORY_WARNING=0.8
MEMORY_CRITICAL=0.9

# Database performance
SLOW_QUERY_THRESHOLD=1000
MAX_QUERY_HISTORY=1000

# Alert settings
AUTO_RESOLVE_WARNING_AFTER=300000
MAX_ALERTS=100
```

## 🚀 **Production Deployment**

### **1. Enable External Monitoring**

```bash
# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# DataDog
DATADOG_ENABLED=true
DATADOG_API_KEY=your_api_key

# New Relic
NEWRELIC_ENABLED=true
NEWRELIC_LICENSE_KEY=your_license_key
```

### **2. Set Up Alerts**

- Configure external monitoring systems
- Set up alert notifications (Slack, email, PagerDuty)
- Monitor critical performance metrics

### **3. Performance Optimization**

- Monitor slow transactions
- Optimize database queries
- Scale resources based on metrics

## 📈 **Best Practices**

### **1. Transaction Design**

- Keep transactions short and focused
- Avoid long-running operations in transactions
- Use appropriate isolation levels
- Handle rollback scenarios gracefully

### **2. Performance Monitoring**

- Monitor transaction performance regularly
- Set up alerts for critical thresholds
- Optimize slow operations
- Track error rates and patterns

### **3. Error Handling**

- Implement proper error handling in transactions
- Log transaction failures with context
- Use retry logic for transient failures
- Monitor and alert on error patterns

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Slow Transactions**

1. Check database query performance
2. Optimize complex operations
3. Consider breaking down large transactions
4. Review database indexes

#### **High Error Rates**

1. Check application logs for errors
2. Review database connection issues
3. Monitor system resources
4. Check for data consistency issues

#### **Memory Issues**

1. Monitor memory usage patterns
2. Check for memory leaks
3. Optimize data processing
4. Scale system resources

## 📚 **Additional Resources**

- [@nestjs-cls/transactional Documentation](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional/typeorm-adapter)
- [NestJS CLS Documentation](https://papooch.github.io/nestjs-cls/)
- [NestJS Performance Best Practices](https://docs.nestjs.com/techniques/performance)
- [Database Performance Optimization](https://www.postgresql.org/docs/current/performance-tips.html)

## 🔄 **Migration from typeorm-transactional**

The system has been migrated from `typeorm-transactional` to `@nestjs-cls/transactional` for better maintainability and NestJS integration.

### **Key Changes:**

1. **Package**: `typeorm-transactional` → `@nestjs-cls/transactional` + `@nestjs-cls/transactional-adapter-typeorm`
2. **Bootstrap**: No more `initializeTransactionalContext()` or `addTransactionalDataSource()` in `main.ts`
3. **Module Setup**: Configured via `ClsModule` with `ClsPluginTransactional` in `DatabaseModule`
4. **Repository Pattern**: Repositories inject `TransactionHost<TransactionalAdapterTypeOrm>` and use `getRepository()` method
5. **Import Path**: `import { Transactional } from '@nestjs-cls/transactional'`

### **Benefits:**

- Better integration with NestJS dependency injection
- No monkey-patching of TypeORM
- More predictable transaction propagation
- Active maintenance and support
- Better TypeScript support

---

## 🎉 **Summary**

Your LMS backend now has:

- ✅ **17 methods** wrapped in transactions
- ✅ **Comprehensive performance monitoring**
- ✅ **Real-time alert system**
- ✅ **Production-ready configuration**
- ✅ **Advanced logging and metrics**

The system is ready for production deployment with robust transaction management and performance monitoring! 🚀
