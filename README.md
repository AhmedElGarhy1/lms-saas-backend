# SaaS LMS Backend

A modular, secure backend for a SaaS Learning Management System (LMS) built with **NestJS**, **PostgreSQL**, and **Prisma ORM**.
It features robust RBAC + PBAC access control, multi-center and teacher support, and a clean, scalable architecture.

---

## 🧱 Architecture

- **NestJS** modular monolith (feature-sliced modules)
- **Prisma ORM** with PostgreSQL
- **JWT + Refresh Tokens** for authentication
- **Winston** for global logging
- **DTOs + class-validator** for validation
- **RBAC + PBAC** hybrid access control
- **Context-based access** (center or teacher)
- **Swagger** for API documentation

---

## 📦 Main Modules

- **auth**: Authentication (signup, login, JWT/refresh, logout, 2FA)
- **users**: User profile and password management
- **access-control**: Roles, permissions, and guards
- **centers**: Center (institution) management
- **roles**: Role management

---

## 🧠 Core Concepts

- **User**: Can belong to multiple centers, have roles per center, and participate in teacher-scoped relationships.
- **Center**: An institution that can host multiple users and teachers.
- **Role**: Defines a set of permissions (e.g., Admin, Owner, Teacher, Assistant, User).
- **Permission**: Fine-grained actions (e.g., user:view, user:update, center:manage).
- **UserOnCenter**: Assigns a user a role in a specific center.
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

### **Centers**

- (Endpoints for creating/managing centers are scaffolded; see `CentersController`)

### **Roles & Permissions**

- `GET /access-control/roles` — List all roles
- `GET /access-control/permissions` — List all permissions
- `GET /access-control/centers/:centerId/users/:userId/roles` — Get a user’s roles in a center
- `GET /access-control/centers/:centerId/users/:userId/permissions` — Get a user’s permissions in a center

### **Role & Permission Assignment**

- `POST /access-control/assign-role` — Assign a role to a user in a center or teacher scope
- `DELETE /access-control/remove-role` — Remove a role from a user in a center or teacher scope
- `POST /access-control/assign-permission` — Assign a permission to a user (override) or to a role
- `DELETE /access-control/remove-permission` — Remove a permission from a user (override) or from a role

---

## 🗄️ Database Schema (Prisma)

- **User**: Core user model, with relations to centers, roles, permissions, 2FA, etc.
- **Center**: Represents an institution; users are assigned via `UserOnCenter`.
- **Role**: Named roles (Admin, Owner, Teacher, etc.), mapped to permissions.
- **Permission**: Named permissions (user:view, center:manage, etc.).
- **UserOnCenter**: Assigns a user a role in a center.
- **TeacherUser**: Assigns a user a role in the context of a teacher.
- **UserPermission**: Per-user permission overrides, optionally scoped.
- **RefreshToken, EmailVerification, PasswordResetToken**: For authentication flows.

---

## 🛠️ Technologies

- **NestJS** (modular, scalable backend)
- **Prisma ORM** (type-safe DB access)
- **PostgreSQL** (database)
- **Winston** (logging)
- **class-validator** (validation)
- **Swagger** (API docs)

---

## 🧩 Extensibility

- The system is modular: add new modules (students, schedule, payments, etc.) as needed.
- All modules should use DTOs for validation and guards for access control.
- Context-based access (center or teacher) is enforced throughout.

---

## 🚦 Error Handling

- **401 Unauthorized**: Invalid/missing JWT
- **403 Forbidden**: Insufficient role/permission
- **400 Bad Request**: Invalid data
- **404 Not Found**: Resource does not exist

---

## 📝 Development

- **Run migrations:**  
  `npx prisma migrate dev --name init`
- **Run the app:**  
  `npm run start:dev`
- **Run tests:**  
  `npm run test` (unit)  
  `npm run test:e2e` (E2E)

---

## 📚 API Documentation

- Swagger docs available at `/api/docs` (if enabled in your app).

---

## 🧠 Notes

- All sensitive endpoints require a valid JWT.
- Most endpoints require a `centerId` or `teacherId` in the request body for context.
- All access control is enforced via guards and decorators.

---

**This README reflects your current backend system. If you add new modules or endpoints, update this file accordingly!**
