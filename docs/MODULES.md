# Module Documentation

This document provides detailed information about each module in the DDD architecture.

## 📁 Module Overview

The application is organized into domain modules following Domain-Driven Design principles. Each module is self-contained with its own controllers, services, repositories, and entities.

---

## 🧑‍💼 User Module

**Location**: `src/modules/user/`

### Purpose

Handles user profile management, password changes, and user-related operations.

### Structure

```
user/
├── controllers/
│   └── user.controller.ts
├── services/
│   └── user.service.ts
├── repositories/
│   └── user.repository.ts
├── entities/
│   └── user.entity.ts
├── dto/
│   ├── update-user.dto.ts
│   └── change-password.dto.ts
└── user.module.ts
```

### Key Features

- **Profile Management**: Update user profile information
- **Password Management**: Change user passwords securely
- **User Retrieval**: Get current user information
- **Base Repository Integration**: Uses the BaseRepository pattern for data access

### API Endpoints

- `GET /users/me` — Get current user profile
- `PUT /users/me` — Update user profile
- `PATCH /users/me/password` — Change password

### Dependencies

- BaseRepository for data access
- JWT authentication
- Permission-based access control

---

## 🔐 Auth Module

**Location**: `src/modules/auth/`

### Purpose

Handles all authentication-related operations including login, registration, JWT management, and 2FA.

### Structure

```
auth/
├── controllers/
│   └── auth.controller.ts
├── services/
│   └── auth.service.ts
├── repositories/
│   └── auth.repository.ts
├── entities/
│   ├── user.entity.ts
│   ├── refresh-token.entity.ts
│   ├── email-verification.entity.ts
│   └── password-reset-token.entity.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── refresh-token.guard.ts
├── strategies/
│   └── jwt.strategy.ts
├── dto/
│   ├── signup.dto.ts
│   ├── login.dto.ts
│   ├── refresh-token.dto.ts
│   └── 2fa.dto.ts
└── auth.module.ts
```

### Key Features

- **User Registration**: Secure user signup with email verification
- **Authentication**: JWT-based login with refresh tokens
- **2FA Support**: Two-factor authentication setup and management
- **Password Reset**: Secure password reset flow
- **Email Verification**: Email verification for new accounts
- **Logout**: Secure token invalidation

### API Endpoints

- `POST /auth/signup` — Register new user
- `POST /auth/login` — Login and receive JWT tokens
- `POST /auth/refresh-token` — Refresh JWT tokens
- `POST /auth/logout` — Logout
- `POST /auth/verify-email` — Verify email address
- `POST /auth/forgot-password` — Request password reset
- `POST /auth/reset-password` — Reset password
- `POST /auth/2fa/setup` — Setup 2FA
- `POST /auth/2fa/enable` — Enable 2FA
- `POST /auth/2fa/disable` — Disable 2FA

### Dependencies

- JWT strategy for authentication
- MailerService for email notifications
- BaseRepository for data access
- bcrypt for password hashing

---

## 🛡️ Access Control Module

**Location**: `src/modules/access-control/`

### Purpose

Manages permissions, user access control, and permission-based authorization.

### Structure

```
access-control/
├── controllers/
│   └── access-control.controller.ts
├── services/
│   └── access-control.service.ts
├── repositories/
│   └── access-control.repository.ts
├── entities/
│   ├── permission.entity.ts
│   ├── user-permission.entity.ts
│   └── user-on-center.entity.ts
├── guards/
│   ├── permissions.guard.ts
│   └── context.guard.ts
├── decorators/
│   ├── permissions.decorator.ts
│   ├── validate-center-access.decorator.ts
│   └── context-scope.decorator.ts
├── constants/
│   └── permissions.ts
├── dto/
│   ├── assign-permission.dto.ts
│   └── assign-role.dto.ts
└── access-control.module.ts
```

### Key Features

- **Permission Management**: Create, assign, and manage permissions
- **Context-Aware Access**: Support for ADMIN and CENTER scopes
- **User Permission Overrides**: Per-user permission assignments
- **Center-Based Access**: Center-scoped permission management
- **Permission Validation**: Guards and decorators for endpoint protection

### API Endpoints

- `GET /access-control/permissions` — List all permissions
- `GET /access-control/centers/:centerId/users/:userId/permissions` — Get user permissions
- `POST /access-control/assign-permission` — Assign permission to user/role
- `DELETE /access-control/remove-permission` — Remove permission from user/role

### Dependencies

- BaseRepository for data access
- Context-aware guards
- Permission decorators

---

## 👥 Roles Module

**Location**: `src/modules/roles/`

### Purpose

Manages role creation, assignment, and role-based access control.

### Structure

```
roles/
├── controllers/
│   └── roles.controller.ts
├── services/
│   └── roles.service.ts
├── repositories/
│   └── roles.repository.ts
├── entities/
│   ├── role.entity.ts
│   ├── user-role.entity.ts
│   └── teacher-user.entity.ts
├── constants/
│   └── role-type.enum.ts
├── dto/
│   ├── create-role.dto.ts
│   ├── update-role.dto.ts
│   └── assign-role.dto.ts
└── roles.module.ts
```

### Key Features

- **Role Management**: Create, update, and delete roles
- **Role Assignment**: Assign roles to users in specific contexts
- **Context-Aware Roles**: Support for ADMIN and CENTER scopes
- **Role Hierarchy**: Different role types with specific permissions
- **Teacher-User Relationships**: Teacher-scoped role assignments

### API Endpoints

- `GET /roles` — List all roles
- `POST /roles` — Create a new role
- `PUT /roles/:id` — Update a role
- `DELETE /roles/:id` — Delete a role
- `GET /access-control/centers/:centerId/users/:userId/roles` — Get user roles
- `POST /access-control/assign-role` — Assign role to user
- `DELETE /access-control/remove-role` — Remove role from user

### Dependencies

- BaseRepository for data access
- Permission system integration
- Context-aware validation

---

## 🔧 Common Module

**Location**: `src/common/`

### Purpose

Provides shared, domain-agnostic functionality used across all modules.

### Structure

```
common/
├── repositories/
│   └── base.repository.ts
├── guards/
│   └── permissions.guard.ts
├── decorators/
│   ├── get-user.decorator.ts
│   ├── public.decorator.ts
│   └── pagination-docs.decorator.ts
├── interceptors/
│   └── error.interceptor.ts
├── utils/
│   ├── zod-validation.pipe.ts
│   ├── pagination.utils.ts
│   └── zod-schema.decorator.ts
├── types/
│   ├── current-user.type.ts
│   ├── pagination.types.ts
│   └── search.types.ts
└── validation/
    └── zod.config.ts
```

### Key Features

- **Base Repository**: Comprehensive data access pattern
- **Global Guards**: Authentication and authorization guards
- **Shared Decorators**: Common decorators for controllers
- **Validation**: Zod-based schema validation
- **Pagination**: Standardized pagination utilities
- **Error Handling**: Global error interception

### Dependencies

- TypeORM for database operations
- Winston for logging
- Zod for validation

---

## 🏗️ Infrastructure Module

**Location**: `src/infrastructure/`

### Purpose

Provides infrastructure services and configuration that are not domain-specific.

### Structure

```
infrastructure/
├── database/
│   ├── typeorm.config.ts
│   ├── migrations/
│   └── seeds/
├── config/
│   └── app.config.ts
└── mailer/
    ├── mailer.service.ts
    └── mail.module.ts
```

### Key Features

- **Database Configuration**: TypeORM setup and configuration
- **Application Configuration**: Environment-based configuration
- **Email Infrastructure**: Mailer service for notifications
- **Database Migrations**: Schema migration management
- **Database Seeding**: Initial data population

### Dependencies

- TypeORM for database operations
- ConfigService for configuration
- Nodemailer for email functionality

---

## 📋 Module Dependencies

### Dependency Graph

```
AppModule
├── UserModule
│   └── BaseRepository
├── AuthModule
│   ├── BaseRepository
│   ├── MailerService
│   └── JWT Strategy
├── AccessControlModule
│   └── BaseRepository
├── RolesModule
│   └── BaseRepository
├── SharedModule
│   ├── DatabaseModule
│   ├── MailModule
│   └── PermissionsGuard
└── Common (shared across all)
```

### Cross-Module Communication

- **Authentication**: All modules use JWT authentication
- **Authorization**: All modules use permission-based guards
- **Data Access**: All modules use BaseRepository pattern
- **Validation**: All modules use Zod validation
- **Logging**: All modules use Winston logging

---

## 🚀 Adding New Modules

To add a new module following the DDD pattern:

1. **Create Module Structure**:

   ```
   src/modules/new-module/
   ├── controllers/
   ├── services/
   ├── repositories/
   ├── entities/
   ├── dto/
   └── new-module.module.ts
   ```

2. **Extend BaseRepository**:

   ```typescript
   @Injectable()
   export class NewModuleRepository extends BaseRepository<NewEntity> {
     constructor(
       @InjectRepository(NewEntity)
       repository: Repository<NewEntity>,
       dataSource: DataSource,
       logger: Logger,
     ) {
       super(repository, dataSource, logger);
     }
   }
   ```

3. **Use Common Patterns**:
   - Use Zod validation for DTOs
   - Use permission decorators for endpoints
   - Use BaseRepository for data access
   - Follow the established naming conventions

4. **Register in AppModule**:
   ```typescript
   @Module({
     imports: [
       // ... other modules
       NewModule,
     ],
   })
   export class AppModule {}
   ```

---

## 🔍 Best Practices

### Module Design

- **Single Responsibility**: Each module handles one domain
- **Encapsulation**: Internal implementation details are hidden
- **Dependency Injection**: Use NestJS DI container
- **Type Safety**: Full TypeScript support throughout

### Data Access

- **Repository Pattern**: Use BaseRepository for all data access
- **Transaction Support**: Use transaction methods for complex operations
- **Soft Delete**: Use soft delete for data preservation
- **Pagination**: Implement pagination for list endpoints

### Security

- **Authentication**: JWT-based authentication
- **Authorization**: Permission-based access control
- **Validation**: Zod schema validation
- **Context Awareness**: Center and teacher scoped access

### Error Handling

- **Global Interceptors**: Centralized error handling
- **Type-Safe Errors**: Proper error types and messages
- **Logging**: Comprehensive logging with Winston

---

This documentation provides a comprehensive overview of the module architecture. Each module is designed to be self-contained while following common patterns and conventions.
