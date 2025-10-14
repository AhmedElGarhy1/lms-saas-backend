# LMS Backend - Comprehensive Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Design Patterns](#architecture--design-patterns)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Core Modules](#core-modules)
6. [Database Layer](#database-layer)
7. [Shared Layer](#shared-layer)
8. [Authentication & Authorization](#authentication--authorization)
9. [API Design & Standards](#api-design--standards)
10. [Testing Strategy](#testing-strategy)
11. [Configuration & Environment](#configuration--environment)
12. [Deployment & DevOps](#deployment--devops)
13. [Security Implementation](#security-implementation)
14. [Performance & Monitoring](#performance--monitoring)
15. [Development Guidelines](#development-guidelines)

## Project Overview

This is a **Learning Management System (LMS) SaaS Backend** built with NestJS, designed to support multi-tenant educational centers with comprehensive role-based access control, user management, and center administration capabilities.

### Key Features

- **Multi-tenant Architecture**: Support for multiple educational centers
- **Role-Based Access Control (RBAC)**: Granular permission system with scope-based access
- **JWT Authentication**: Secure authentication with refresh tokens
- **Two-Factor Authentication (2FA)**: Enhanced security with TOTP support
- **Soft Delete**: Data integrity with soft deletion across all entities
- **Activity Logging**: Comprehensive audit trail
- **Email Verification & Password Reset**: Complete user onboarding flow
- **Pagination & Filtering**: Advanced data retrieval capabilities
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation

## Architecture & Design Patterns

### Architectural Patterns

- **Modular Architecture**: Clean separation of concerns with feature-based modules
- **Repository Pattern**: Data access abstraction layer
- **Service Layer Pattern**: Business logic encapsulation
- **DTO Pattern**: Data transfer object validation and transformation
- **Guard Pattern**: Authorization and authentication middleware
- **Interceptor Pattern**: Cross-cutting concerns (logging, response transformation)
- **Factory Pattern**: Database seeding and test data generation

### Design Principles

- **SOLID Principles**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **DRY (Don't Repeat Yourself)**: Shared utilities and common functionality
- **Separation of Concerns**: Clear boundaries between layers
- **Dependency Injection**: IoC container for loose coupling
- **Event-Driven Architecture**: Decoupled communication between modules

## Technology Stack

### Core Framework

- **NestJS 11.x**: Progressive Node.js framework with TypeScript
- **TypeScript 5.8**: Strongly typed JavaScript with advanced features
- **Node.js**: Runtime environment

### Database & ORM

- **PostgreSQL**: Primary relational database
- **TypeORM 0.3.25**: Object-Relational Mapping with decorators
- **Database Migrations**: Version-controlled schema changes

### Authentication & Security

- **JWT (JSON Web Tokens)**: Stateless authentication
- **Passport.js**: Authentication middleware
- **bcrypt**: Password hashing
- **speakeasy**: Two-factor authentication (TOTP)
- **helmet**: Security headers middleware

### API & Documentation

- **Swagger/OpenAPI 3.0**: API documentation and testing
- **class-validator**: DTO validation
- **class-transformer**: Object transformation

### Testing

- **Jest**: Testing framework
- **Supertest**: HTTP assertion library
- **@faker-js/faker**: Test data generation

### Additional Libraries

- **Winston**: Logging framework
- **Nodemailer**: Email service
- **BullMQ**: Queue management
- **ioredis**: Redis client
- **Axios**: HTTP client
- **QRCode**: QR code generation

## Project Structure

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module configuration
├── database/                        # Database layer
│   ├── config/                      # Database configuration
│   ├── factories/                   # Data factories for seeding
│   ├── migrations/                  # Database migrations
│   ├── seed.ts                      # Database seeding script
│   └── seeder.module.ts             # Seeder module
├── modules/                         # Feature modules
│   ├── auth/                        # Authentication module
│   ├── access-control/              # RBAC module
│   ├── centers/                     # Center management module
│   └── user/                        # User management module
└── shared/                          # Shared utilities and services
    ├── common/                      # Common utilities
    ├── config/                      # Configuration
    ├── controllers/                 # Shared controllers
    ├── database.service.ts          # Database service
    ├── modules/                     # Shared modules
    ├── services/                    # Shared services
    └── shared.module.ts             # Shared module
```

## Core Modules

### 1. Authentication Module (`src/modules/auth/`)

**Purpose**: Handles user authentication, authorization, and security features.

**Key Components**:

- **AuthService**: Core authentication logic
- **JwtStrategy**: JWT token validation strategy
- **RefreshTokenStrategy**: Refresh token handling
- **TwoFactorService**: 2FA implementation
- **EmailVerificationService**: Email verification flow
- **PasswordResetService**: Password reset functionality

**Entities**:

- `User`: Core user entity
- `RefreshToken`: JWT refresh token storage
- `EmailVerification`: Email verification tokens
- `PasswordResetToken`: Password reset tokens

**Endpoints**:

- `POST /auth/signup` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/logout` - User logout
- `POST /auth/refresh-token` - Token refresh
- `POST /auth/verify-email` - Email verification
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Password reset
- `POST /auth/2fa/setup` - 2FA setup
- `POST /auth/2fa/enable` - 2FA enable
- `POST /auth/2fa/verify` - 2FA verification

### 2. Access Control Module (`src/modules/access-control/`)

**Purpose**: Implements role-based access control with granular permissions.

**Key Components**:

- **AccessControlService**: Core RBAC logic
- **AccessControlHelperService**: Permission checking utilities
- **RolesService**: Role management
- **PermissionService**: Permission management

**Entities**:

- `Role`: Role definitions with types (ADMIN, CENTER, SYSTEM)
- `Permission`: Granular permission definitions
- `UserRole`: User-role assignments
- `RolePermission`: Role-permission mappings
- `CenterAccess`: Center-specific access control

**Permission System**:

- **Scope-based**: ADMIN (global), CENTER (center-specific)
- **Action-based**: CREATE, READ, UPDATE, DELETE operations
- **Resource-based**: Specific resource types (users, centers, roles)

**Endpoints**:

- `GET /roles` - List roles with pagination
- `POST /roles` - Create new role
- `GET /roles/:id` - Get role details
- `PUT /roles/:id` - Update role
- `DELETE /roles/:id` - Delete role
- `POST /roles/:id/permissions` - Assign permissions to role

### 3. Centers Module (`src/modules/centers/`)

**Purpose**: Manages educational centers (multi-tenant support).

**Key Components**:

- **CentersService**: Center management logic
- **CenterEventsService**: Center-related event handling

**Entities**:

- `Center`: Center entity with metadata

**Endpoints**:

- `GET /centers` - List centers
- `POST /centers` - Create center
- `GET /centers/:id` - Get center details
- `PUT /centers/:id` - Update center
- `DELETE /centers/:id` - Delete center

### 4. User Module (`src/modules/user/`)

**Purpose**: User management and profile handling.

**Key Components**:

- **UserService**: User management logic
- **ProfileService**: User profile management

**Entities**:

- `User`: Core user entity
- `Profile`: User profile information
- `UserAccess`: User access control

**Endpoints**:

- `GET /users` - List users with pagination
- `POST /users` - Create user
- `GET /users/:id` - Get user details
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile
- `POST /users/change-password` - Change password

## Database Layer

### Database Configuration

- **Type**: PostgreSQL
- **ORM**: TypeORM with decorators
- **Connection**: Environment-based configuration
- **Migrations**: Version-controlled schema changes
- **Seeding**: Automated test data generation

### Entity Design

All entities extend `BaseEntity` which provides:

- `id`: UUID primary key
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `deletedAt`: Soft delete timestamp
- `createdBy`: Creator user ID
- `updatedBy`: Last updater user ID
- `deletedBy`: Deleter user ID

### Key Entities

#### User Entity

```typescript
@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  fullName: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isTwoFactorEnabled: boolean;

  @Column({ nullable: true })
  twoFactorSecret: string;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockedUntil: Date;
}
```

#### Role Entity

```typescript
@Entity('roles')
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RoleType,
    default: RoleType.CENTER,
  })
  type: RoleType;

  @Column({ type: 'uuid', nullable: true })
  centerId?: string;

  @Column({ type: 'boolean', default: false })
  readOnly: boolean;
}
```

### Migrations

- `1734567890123-AddUniqueConstraintToUserRoles.ts`
- `1759457354738-RemoveCenterAccessTable.ts`
- `1759457354741-CreateRolePermissionsTable.ts`

### Seeding System

- **Factories**: Generate realistic test data
- **Role Definitions**: Predefined system roles
- **User Factories**: Generate test users
- **Center Factories**: Generate test centers

## Shared Layer

### Common Utilities (`src/shared/common/`)

#### Decorators

- `@Public()`: Mark endpoints as public (no auth required)
- `@Permissions()`: Define required permissions
- `@Scope()`: Define access scope (ADMIN/CENTER)
- `@GetUser()`: Extract user from request
- `@LogActivity()`: Automatic activity logging
- `@ApiPagination()`: Pagination documentation
- `@ApiResponses()`: Standardized response documentation

#### Guards

- `JwtAuthGuard`: JWT token validation
- `PermissionsGuard`: Permission checking
- `ContextGuard`: Request context validation
- `ThrottlerGuard`: Rate limiting

#### Interceptors

- `ResponseInterceptor`: Standardize API responses
- `ErrorInterceptor`: Error handling and logging
- `PerformanceInterceptor`: Request timing
- `ClassSerializerInterceptor`: Response serialization

#### Filters

- `GlobalExceptionFilter`: Global error handling
- `TypeOrmExceptionFilter`: Database error handling

#### Pipes

- `CustomValidationPipe`: DTO validation with custom error messages

### Services (`src/shared/services/`)

#### LoggerService

- Winston-based logging
- Structured logging with context
- Multiple log levels
- Request correlation IDs

#### MailerService

- Email sending with templates
- SMTP configuration
- Email verification
- Password reset emails

#### DatabaseService

- Database connection management
- Transaction support
- Query execution
- Connection lifecycle

#### HealthService

- Application health checks
- Database connectivity
- Service status monitoring

### Base Classes

#### BaseEntity

```typescript
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  @Column({ type: 'uuid', nullable: true })
  deletedBy?: string;
}
```

#### BaseRepository

- Generic CRUD operations
- Pagination support
- Soft delete handling
- Query building utilities

### Exception Handling

Custom exceptions with enhanced error responses:

- `ResourceNotFoundException`
- `ResourceAlreadyExistsException`
- `InsufficientPermissionsException`
- `ValidationFailedException`
- `AuthenticationFailedException`
- `BusinessLogicException`

## Authentication & Authorization

### JWT Authentication

- **Access Tokens**: Short-lived (15 minutes)
- **Refresh Tokens**: Long-lived (7 days)
- **Token Storage**: Database-backed refresh tokens
- **Token Rotation**: New refresh token on each use

### Two-Factor Authentication

- **TOTP Implementation**: Time-based one-time passwords
- **QR Code Generation**: Easy setup for authenticator apps
- **Backup Codes**: Recovery mechanism
- **Grace Period**: Temporary access during setup

### Role-Based Access Control

#### Role Types

1. **SYSTEM Roles**: Global system roles (Parent, Student, Teacher)
2. **ADMIN Roles**: Administrative roles (Super Admin, Country Manager)
3. **CENTER Roles**: Center-specific roles (Owner, Manager, Assistant)

#### Permission System

- **Scope-based**: ADMIN (global) vs CENTER (center-specific)
- **Action-based**: CREATE, READ, UPDATE, DELETE
- **Resource-based**: users, centers, roles, permissions

#### Access Control Flow

1. **Authentication**: JWT token validation
2. **Context Resolution**: Determine user's scope and center access
3. **Permission Check**: Verify required permissions
4. **Resource Access**: Apply center-specific filtering

### Security Features

- **Password Hashing**: bcrypt with salt rounds
- **Account Lockout**: Failed login attempt protection
- **Rate Limiting**: API endpoint protection
- **CORS Configuration**: Cross-origin request control
- **Security Headers**: Helmet middleware
- **Input Validation**: DTO validation with sanitization

## API Design & Standards

### RESTful API Design

- **Resource-based URLs**: `/users`, `/centers`, `/roles`
- **HTTP Methods**: GET, POST, PUT, DELETE, PATCH
- **Status Codes**: Standard HTTP status codes
- **Content Types**: JSON request/response

### Response Format

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp: string;
  requestId: string;
  processingTime: number;
}
```

### Pagination

- **Query Parameters**: `page`, `limit`, `search`, `sortBy`, `filter`
- **Response Format**: Standardized pagination metadata
- **Default Values**: page=1, limit=10, max=100

### Error Handling

- **Structured Errors**: Consistent error response format
- **Error Codes**: Machine-readable error codes
- **User Messages**: Human-readable error messages
- **Action Required**: Suggested actions for users
- **Debug Information**: Development-only debug details

### API Documentation

- **Swagger/OpenAPI 3.0**: Auto-generated documentation
- **Interactive Testing**: Built-in API testing interface
- **Schema Validation**: Request/response schema documentation
- **Authentication**: Bearer token documentation

## Testing Strategy

### Testing Framework

- **Jest**: Primary testing framework
- **Supertest**: HTTP endpoint testing
- **TypeORM Testing**: Database integration testing

### Test Types

#### Unit Tests

- Service layer testing
- Repository testing
- Utility function testing
- Mock dependencies

#### Integration Tests

- Database integration
- Service integration
- Module integration

#### End-to-End Tests

- Complete API workflows
- Authentication flows
- User journeys
- Error scenarios

### Test Structure

```
test/
├── app.e2e-spec.ts                    # Basic app testing
├── auth.e2e-spec.ts                   # Authentication testing
├── users.e2e-spec.ts                  # User management testing
├── access-control.e2e-spec.ts         # RBAC testing
├── center-access-validation.e2e-spec.ts # Center access testing
└── error-handling.e2e-spec.ts         # Error handling testing
```

### Test Data

- **Factories**: Generate test data
- **Fixtures**: Predefined test scenarios
- **Mocking**: External service mocking
- **Database Seeding**: Test database setup

## Configuration & Environment

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=root
DB_NAME=lms

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# Application
NODE_ENV=development
PORT=3000
```

### Configuration Management

- **ConfigModule**: Global configuration
- **Environment-based**: Different configs per environment
- **Validation**: Environment variable validation
- **Type Safety**: TypeScript configuration interfaces

## Deployment & DevOps

### Build Process

- **TypeScript Compilation**: Source to JavaScript
- **Asset Optimization**: Bundle optimization
- **Environment Configuration**: Build-time configuration
- **Docker Support**: Containerization ready

### Scripts

```json
{
  "build": "nest build",
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:prod": "node dist/main",
  "test": "jest",
  "test:e2e": "jest --config ./test/jest-e2e.json",
  "db:migrate": "typeorm migration:run",
  "db:seed": "ts-node src/database/seed.ts"
}
```

### Database Management

- **Migrations**: Version-controlled schema changes
- **Seeding**: Development and test data
- **Backup**: Database backup strategies
- **Monitoring**: Database performance monitoring

## Security Implementation

### Authentication Security

- **JWT Security**: Secure token generation and validation
- **Password Security**: Strong password requirements
- **Session Management**: Secure session handling
- **Token Rotation**: Regular token refresh

### Authorization Security

- **Principle of Least Privilege**: Minimal required permissions
- **Scope Isolation**: Center-specific access control
- **Permission Validation**: Server-side permission checking
- **Audit Logging**: Security event logging

### Data Security

- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Output encoding
- **CSRF Protection**: Cross-site request forgery prevention

### Infrastructure Security

- **HTTPS Enforcement**: SSL/TLS encryption
- **Security Headers**: Helmet middleware
- **Rate Limiting**: DDoS protection
- **CORS Configuration**: Cross-origin security

## Performance & Monitoring

### Performance Optimization

- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Database connection management
- **Caching Strategy**: Redis-based caching
- **Query Optimization**: Efficient database queries

### Monitoring & Logging

- **Winston Logging**: Structured application logging
- **Request Tracking**: Request correlation IDs
- **Performance Metrics**: Response time monitoring
- **Error Tracking**: Comprehensive error logging

### Health Checks

- **Application Health**: Service availability
- **Database Health**: Connection status
- **External Services**: Third-party service status
- **Resource Monitoring**: Memory and CPU usage

## Development Guidelines

### Code Standards

- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Naming Conventions**: Consistent naming patterns

### Git Workflow

- **Feature Branches**: Feature-based development
- **Pull Requests**: Code review process
- **Commit Messages**: Conventional commit format
- **Branch Protection**: Main branch protection

### Documentation

- **Code Comments**: Inline documentation
- **API Documentation**: Swagger/OpenAPI
- **README Files**: Module documentation
- **Architecture Decisions**: ADR documentation

### Testing Requirements

- **Test Coverage**: Minimum coverage requirements
- **Test Quality**: Meaningful test cases
- **Continuous Integration**: Automated testing
- **Test Data**: Realistic test scenarios

---

## Conclusion

This LMS Backend represents a robust, scalable, and secure foundation for a multi-tenant educational platform. The architecture emphasizes clean code principles, comprehensive security, and maintainable design patterns. The modular structure allows for easy extension and modification while maintaining system integrity and performance.

The implementation follows industry best practices for authentication, authorization, data management, and API design, making it suitable for production deployment in educational environments requiring high security and reliability standards.
