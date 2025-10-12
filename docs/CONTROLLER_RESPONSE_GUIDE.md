# Controller Response Guide

## Simple Response Class

Use the `ControllerResponse` class for consistent, user-friendly messages in your controllers.

### Basic Usage

```typescript
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

// For operations that return data
return ControllerResponse.success(user, 'User created successfully');

// For operations that only need a message
return ControllerResponse.message('Password changed successfully');
```

### Examples

#### User Controller

```typescript
// Create user
async createUser(@Body() dto: CreateUserDto) {
  const user = await this.userService.create(dto);
  return ControllerResponse.success(user, 'User created successfully');
}

// Update user
async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
  const user = await this.userService.update(id, dto);
  return ControllerResponse.success(user, 'User updated successfully');
}

// Delete user
async deleteUser(@Param('id') id: string) {
  await this.userService.delete(id);
  return ControllerResponse.message('User deleted successfully');
}

// Change password
async changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
  await this.userService.changePassword(id, dto);
  return ControllerResponse.message('Password changed successfully');
}
```

#### Auth Controller

```typescript
// Login
async login(@Body() dto: LoginDto) {
  const result = await this.authService.login(dto);
  return ControllerResponse.success(result, 'Login successful');
}

// Logout
async logout(@GetUser() user: User) {
  await this.authService.logout(user.id);
  return ControllerResponse.message('Logout successful');
}
```

#### Roles Controller

```typescript
// Create role
async createRole(@Body() dto: CreateRoleDto) {
  const role = await this.rolesService.create(dto);
  return ControllerResponse.success(role, 'Role created successfully');
}

// Assign role
async assignRole(@Body() dto: AssignRoleDto) {
  await this.rolesService.assign(dto);
  return ControllerResponse.message('Role assigned successfully');
}
```

### Benefits

1. **Consistent Messages**: All controllers use the same format
2. **User-Friendly**: Messages are clear and actionable
3. **Simple**: Just two methods - `success()` and `message()`
4. **Type-Safe**: Full TypeScript support
5. **Automatic Wrapping**: The response interceptor handles the rest

### Response Format

The response interceptor automatically wraps your response in the standard format:

```json
{
  "success": true,
  "data": {
    /* your data */
  },
  "message": "User created successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123",
  "processingTime": 150
}
```

### Migration

Replace existing return statements:

```typescript
// Before
return { data: user, message: 'User created successfully' };
return { message: 'User deleted successfully' };

// After
return ControllerResponse.success(user, 'User created successfully');
return ControllerResponse.message('User deleted successfully');
```

