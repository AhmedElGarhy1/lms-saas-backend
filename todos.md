# TODOs

## Code Quality (In Progress)

- ⏳ Fix remaining linter errors: Address line ending issues and unused imports (50+ issues remaining)
- ⏳ Fix TypeScript compilation errors: Resolve circular dependencies and missing methods between services
- ⏳ Complete path mapping migration: Update all remaining files to use @/ imports instead of relative paths

## General Improvements (Remaining Tasks)

- [ ] Remove any type and make sure all endpoints are paginated
- [ ] Add proper error handling for permission checks in UserController
- [ ] Implement missing methods in RolesService (e.g., `removeAllUserRoles`)
- [ ] Fix circular dependencies between AccessControlService and PermissionService
- [ ] Add missing methods to services (e.g., `getUserRoles`, `createDefaultCenterAdminRole`)

## Code Quality (Remaining Tasks)

- [ ] Add comprehensive unit tests for all new endpoints
- [ ] Add integration tests for user management flows
- [ ] Improve API documentation with better examples
- [ ] Add validation pipes for all DTOs

## Performance Optimizations (Remaining Tasks)

- [ ] Optimize database queries with proper indexing
- [ ] Implement caching for frequently accessed user data
- [ ] Add bulk operations for user management

## Security Enhancements (Remaining Tasks)

- [ ] Implement proper permission checking in UserController
- [ ] Add rate limiting for sensitive endpoints
- [ ] Add audit logging for user management actions

## File Organization (Completed)

- ✅ Moved AdminCenterAccess entity to access-control module
- ✅ Moved ContextGuard to common module
- ✅ Moved ContextValidationService to common module
- ✅ Removed RoleSeederService
- ✅ Moved all decorators to common module
- ✅ Moved role-scope.enum.ts to common module
- ✅ Updated TypeScript path mapping to use @/ for src/
- ✅ Updated import paths in key files (app.module.ts, database.config.ts, etc.)

## Current Issues to Fix

1. **TypeScript Stack Overflow**: Circular dependencies causing compilation issues
2. **Missing Methods**: Some services reference methods that don't exist
3. **Import Paths**: Need to complete migration to @/ imports
4. **Linter Errors**: Many unused imports and type issues
