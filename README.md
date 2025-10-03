# SaaS LMS Backend

A modular, secure backend for a SaaS Learning Management System (LMS) built with **NestJS**, **PostgreSQL**, and **TypeORM**.
It features robust RBAC + PBAC access control, multi-center and teacher support, and a clean, scalable Domain-Driven Design (DDD) architecture.

---

## 🏗️ Architecture

- **NestJS** with **Domain-Driven Design (DDD)** architecture
- **TypeORM** with PostgreSQL for data persistence
- **JWT + Refresh Tokens** for authentication
- **Winston** for global logging
- **Zod** for schema validation
- **RBAC + PBAC** hybrid access control
- **Context-based access** (center or teacher)
- **Swagger** for API documentation

---

## 📁 Project Structure

```
src/
├── app/                    # Application entry points
│   ├── main.ts            # Bootstrap file
│   └── app.module.ts      # Root module
├── modules/               # Domain modules (DDD-aligned)
│   ├── user/             # User domain
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── user.module.ts
│   ├── auth/             # Authentication domain
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── guards/
│   │   ├── strategies/
│   │   └── auth.module.ts
│   ├── access-control/   # Access control domain
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── guards/
│   │   ├── decorators/
│   │   └── access-control.module.ts
│   └── roles/           # Roles domain
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── entities/
│       └── roles.module.ts
├── common/              # Shared domain-agnostic code
│   ├── repositories/    # Base repository pattern
│   ├── guards/         # Global guards
│   ├── decorators/     # Shared decorators
│   ├── interceptors/   # Global interceptors
│   ├── utils/          # Shared utilities
│   ├── types/          # Shared type definitions
│   └── validation/     # Zod schemas
├── infrastructure/      # Infrastructure layer
│   ├── database/       # Database configuration
│   │   ├── typeorm.config.ts
│   │   ├── migrations/
│   │   └── seeds/
│   ├── config/         # Application configuration
│   └── mailer/         # Email infrastructure
└── shared/             # Shared services
    ├── modules/        # Shared modules
    └── services/       # Shared services
```

---

## 📦 Main Modules

- **user**: User profile and password management
- **auth**: Authentication (signup, login, JWT/refresh, logout, 2FA)
- **access-control**: Permissions and access control management
- **roles**: Role management and assignment

---

## 🧠 Core Concepts

- **User**: Can belong to multiple centers, have roles per center, and participate in teacher-scoped relationships.
- **Center**: An institution that can host multiple users and teachers.
- **Role**: Defines a set of permissions (e.g., Admin, Owner, Teacher, Assistant, User).
- **Permission**: Fine-grained actions (e.g., user:view, user:update, center:manage).
- **UserCenter**: Assigns a user a role in a specific center.
- **TeacherUser**: Assigns a user a role in the context of a specific teacher.
- **UserPermission**: Per-user permission overrides, optionally scoped by center or teacher.

---

## 🔐 Authentication

- **JWT access tokens** (short-lived) and **refresh tokens** (stored in DB)
- **Password hashing** with bcrypt
- **2FA** (Two-Factor Authentication) support
- **Email verification** and password reset flows

---

## 🛡️ Access Control

- **@Roles()** and **@Permissions()** decorators for endpoints
- **Guards** enforce required roles/permissions in the correct context (center or teacher)
- **PBAC**: Per-user permission overrides possible
- **Context-aware scopes**: Roles and permissions are scoped to ADMIN or CENTER contexts

---

## 📑 API Endpoints

### **Auth**

- `POST /auth/signup` — Register a new user
- `POST /auth/login` — Login and receive JWT tokens
- `POST /auth/refresh-token` — Refresh JWT tokens
- `POST /auth/logout` — Logout (requires JWT)
- `POST /auth/verify-email` — Verify email address
- `POST /auth/forgot-password` — Request password reset
- `POST /auth/reset-password` — Reset password
- `POST /auth/2fa/setup` — Setup 2FA (returns QR code)
- `POST /auth/2fa/enable` — Enable 2FA
- `POST /auth/2fa/disable` — Disable 2FA

### **Users**

- `GET /users/me` — Get current user profile (requires JWT)
- `PUT /users/me` — Update profile (requires JWT, user:update permission)
- `PATCH /users/me/password` — Change password (requires JWT)

### **Roles**

- `GET /roles` — List all roles
- `POST /roles` — Create a new role
- `PUT /roles/:id` — Update a role
- `DELETE /roles/:id` — Delete a role

### **Access Control**

- `GET /access-control/permissions` — List all permissions
- `GET /access-control/centers/:centerId/users/:userId/roles` — Get a user's roles in a center
- `GET /access-control/centers/:centerId/users/:userId/permissions` — Get a user's permissions in a center

### **Role & Permission Assignment**

- `POST /access-control/assign-role` — Assign a role to a user in a center or teacher scope
- `DELETE /access-control/remove-role` — Remove a role from a user in a center or teacher scope
- `POST /access-control/assign-permission` — Assign a permission to a user (override) or to a role
- `DELETE /access-control/remove-permission` — Remove a permission from a user (override) or from a role

---

## 🗄️ Database Schema (TypeORM)

- **User**: Core user model, with relations to centers, roles, permissions, 2FA, etc.
- **Center**: Represents an institution; users are assigned via `UserCenter`.
- **Role**: Named roles (Admin, Owner, Teacher, etc.), mapped to permissions.
- **Permission**: Named permissions (user:view, center:manage, etc.).
- **UserCenter**: Assigns a user a role in a center.
- **TeacherUser**: Assigns a user a role in the context of a specific teacher.
- **UserPermission**: Per-user permission overrides, optionally scoped.
- **RefreshToken, EmailVerification, PasswordResetToken**: For authentication flows.

---

## 🛠️ Technologies

- **NestJS** (modular, scalable backend)
- **TypeORM** (type-safe DB access with decorators)
- **PostgreSQL** (database)
- **Winston** (logging)
- **Zod** (schema validation)
- **Swagger** (API docs)
- **JWT** (authentication)
- **bcrypt** (password hashing)

---

## 🧩 Repository Pattern

The application uses a comprehensive **Base Repository** pattern that provides:

- **CRUD Operations**: Create, Read, Update, Delete
- **Pagination**: Built-in pagination support
- **Search**: Full-text search capabilities
- **Soft Delete**: Mark records as deleted without physical removal
- **Bulk Operations**: Create, update, delete multiple records
- **Transaction Support**: ACID-compliant database transactions
- **Type Safety**: Full TypeScript support

---

## 🧩 Extensibility

- The system follows **Domain-Driven Design** principles
- Add new modules (students, schedule, payments, etc.) as needed
- All modules use the base repository pattern for data access
- Context-based access (center or teacher) is enforced throughout
- Modular architecture allows for easy scaling and maintenance

---

## 🚦 Error Handling

- **401 Unauthorized**: Invalid/missing JWT
- **403 Forbidden**: Insufficient role/permission
- **400 Bad Request**: Invalid data
- **404 Not Found**: Resource does not exist

---

## 📝 Development

- **Run migrations:**  
  `npm run typeorm migration:run`
- **Run the app:**  
  `npm run start:dev`
- **Generate migrations:**  
  `npm run typeorm migration:generate -- -n MigrationName`

---

## 📚 API Documentation

- Swagger docs available at `/api/docs` (if enabled in your app).

---

## 🧠 Notes

- All sensitive endpoints require a valid JWT.
- Most endpoints require a `centerId` or `teacherId` in the request body for context.
- All access control is enforced via guards and decorators.
- The system supports context-aware roles with ADMIN and CENTER scopes.

---

**This README reflects the current DDD architecture with TypeORM. The system is designed for scalability and maintainability following Domain-Driven Design principles.**
