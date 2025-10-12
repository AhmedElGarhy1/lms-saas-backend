# API Response Examples

This document shows the exact response format you'll receive from each type of controller method.

## 🎯 **Response Format**

All responses follow this standardized format:

```json
{
  "success": true,
  "data": {
    /* actual data or null */
  },
  "message": "User-friendly message for display",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 150
  }
}
```

## 📋 **Controller Method Examples**

### **1. GET Methods (Read Operations)**

#### **GET /users** (List with pagination)

```json
{
  "success": true,
  "data": [
    { "id": "123", "name": "John Doe", "email": "john@example.com" },
    { "id": "124", "name": "Jane Smith", "email": "jane@example.com" }
  ],
  "message": "2 items retrieved successfully",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 200
  }
}
```

#### **GET /users/123** (Single item)

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "isActive": true
  },
  "message": "Data retrieved successfully",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 50
  }
}
```

### **2. POST Methods (Create Operations)**

#### **POST /users** (Create new user)

```json
{
  "success": true,
  "data": {
    "id": "125",
    "name": "New User",
    "email": "newuser@example.com",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Resource created successfully",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 300
  }
}
```

#### **POST /users/access** (Grant access - custom message)

```json
{
  "success": true,
  "data": {
    "message": "User access granted successfully"
  },
  "message": "User access granted successfully",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 150
  }
}
```

### **3. PUT/PATCH Methods (Update Operations)**

#### **PUT /users/123** (Update user)

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe Updated",
    "email": "john.updated@example.com",
    "isActive": true,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Resource updated successfully",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 200
  }
}
```

#### **PATCH /users/123/status** (Toggle status - custom message)

```json
{
  "success": true,
  "data": {
    "id": "123",
    "message": "User activated successfully",
    "isActive": true
  },
  "message": "User activated successfully",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 100
  }
}
```

### **4. DELETE Methods (Delete Operations)**

#### **DELETE /users/123** (Delete user)

```json
{
  "success": true,
  "data": {
    "message": "User deleted successfully"
  },
  "message": "User deleted successfully",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 100
  }
}
```

#### **DELETE /users/access** (Revoke access - service returns null)

```json
{
  "success": true,
  "data": null,
  "message": "Resource deleted successfully",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_1705312200000_abc123def",
    "version": "1.0.0",
    "processingTime": 80
  }
}
```

## 🎯 **Key Points for Frontend**

### **1. Always Check `success` Field**

```javascript
if (response.success) {
  // Show success message
  showMessage(response.message);
} else {
  // Handle error (this would be in error response format)
  showError(response.message);
}
```

### **2. Display User Messages**

```javascript
// Always show the message to the user
showNotification(response.message);

// Examples:
// "2 items retrieved successfully"
// "Resource created successfully"
// "User activated successfully"
// "User deleted successfully"
```

### **3. Handle Data Appropriately**

```javascript
// For lists
if (Array.isArray(response.data)) {
  displayList(response.data);
}

// For single items
if (response.data && !Array.isArray(response.data)) {
  displayItem(response.data);
}

// For operations that don't return data
if (!response.data) {
  // Just show the message, no data to display
  showMessage(response.message);
}
```

### **4. Use Request ID for Debugging**

```javascript
// If you need to report issues, include the request ID
console.log(`Request ID: ${response.meta.requestId}`);
```

## 🚀 **Benefits**

1. **Consistent Messages**: Every endpoint provides a user-friendly message
2. **No Data Required**: You don't need to return data from controllers - messages are automatic
3. **Flexible**: Controllers can still return custom messages if needed
4. **User-Friendly**: All messages are designed for end-user display
5. **Debugging**: Request IDs help track issues across the system

## 📝 **Controller Best Practices**

### **Minimal Controller Response (Recommended)**

```typescript
@Delete(':id')
@DeleteApiResponses('Delete a user')
async deleteUser(@Param('id') userId: string) {
  await this.userService.deleteUser(userId);
  // No return needed - interceptor handles the message
}
```

### **Custom Message Response (When Needed)**

```typescript
@Patch(':id/status')
@UpdateApiResponses('Toggle user status')
async toggleUserStatus(@Param('id') userId: string, @Body() dto: ToggleUserDto) {
  await this.userService.activateUser(userId, dto.isActive);
  return { message: `User ${dto.isActive ? 'activated' : 'deactivated'} successfully` };
}
```

This system ensures you **always get a proper message** for every operation, whether the controller returns data or not!

