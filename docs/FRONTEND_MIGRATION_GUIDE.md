# 🚀 Frontend Migration Guide: Staff/Admin Module Refactoring

## 📋 Overview

This document provides a comprehensive guide for frontend developers to migrate from the **original monolithic user management system** to the **new modular architecture**. The refactoring separates staff and admin functionality from the main users module into independent modules with cleaner API endpoints.

## 🎯 Migration Goals

- **Separate Staff and Admin APIs** - Each role type now has its own dedicated endpoints
- **Move Profile Management** - Profile endpoints moved to dedicated `/profiles` route
- **Improved API Organization** - Cleaner URL structure and better separation of concerns
- **Consistent Structure** - Standardized patterns across all modules

---

## 📊 API Endpoint Changes

### 🔄 **Old vs New Endpoint Mapping**

| **Old Endpoint**          | **New Endpoint**    | **Module**      | **Change Type** |
| ------------------------- | ------------------- | --------------- | --------------- |
| `POST /users/staff`       | `POST /staff`       | Staff Module    | ✅ **Moved**    |
| `GET /users/staff`        | `GET /staff`        | Staff Module    | ✅ **Moved**    |
| `PUT /users/staff/:id`    | `PUT /staff/:id`    | Staff Module    | ✅ **Moved**    |
| `DELETE /users/staff/:id` | `DELETE /staff/:id` | Staff Module    | ✅ **Moved**    |
| `POST /users/admin`       | `POST /admin`       | Admin Module    | ✅ **Moved**    |
| `GET /users/admin`        | `GET /admin`        | Admin Module    | ✅ **Moved**    |
| `PUT /users/admin/:id`    | `PUT /admin/:id`    | Admin Module    | ✅ **Moved**    |
| `DELETE /users/admin/:id` | `DELETE /admin/:id` | Admin Module    | ✅ **Moved**    |
| `GET /users/profiles`     | `GET /profiles`     | Profiles Module | ✅ **Moved**    |
| `PUT /users/profiles`     | `PUT /profiles`     | Profiles Module | ✅ **Moved**    |

### 🗂️ **New Module Structure**

```
Original Structure:                New Structure:
/users/staff/*          →        /staff/*
/users/admin/*          →        /admin/*
/users/profiles/*       →        /profiles/*
/users/*                →        /users/* (unchanged)
```

---

## 🚀 **Migration Steps**

### **Step 1: Update API Endpoints**

#### **Before (Original):**

```typescript
// Staff endpoints
const createStaff = () => api.post('/users/staff', data);
const getStaff = () => api.get('/users/staff');
const updateStaff = (id) => api.put(`/users/staff/${id}`, data);
const deleteStaff = (id) => api.delete(`/users/staff/${id}`);

// Admin endpoints
const createAdmin = () => api.post('/users/admin', data);
const getAdmin = () => api.get('/users/admin');
const updateAdmin = (id) => api.put(`/users/admin/${id}`, data);
const deleteAdmin = (id) => api.delete(`/users/admin/${id}`);

// Profile endpoints
const getProfile = () => api.get('/users/profiles');
const updateProfile = () => api.put('/users/profiles', data);
```

#### **After (New):**

```typescript
// Staff endpoints
const createStaff = () => api.post('/staff', data);
const getStaff = () => api.get('/staff');
const updateStaff = (id) => api.put(`/staff/${id}`, data);
const deleteStaff = (id) => api.delete(`/staff/${id}`);

// Admin endpoints
const createAdmin = () => api.post('/admin', data);
const getAdmin = () => api.get('/admin');
const updateAdmin = (id) => api.put(`/admin/${id}`, data);
const deleteAdmin = (id) => api.delete(`/admin/${id}`);

// Profile endpoints
const getProfile = () => api.get('/profiles');
const updateProfile = () => api.put('/profiles', data);
```

---

## 🎯 **Key Benefits of Migration**

### **1. Better API Organization**

- **Dedicated endpoints** for each role type
- **Cleaner URL structure** (`/staff` instead of `/users/staff`)
- **Easier to maintain** with separated concerns

### **2. Enhanced Maintainability**

- **Modular architecture** for easier updates
- **Consistent patterns** across all modules
- **Future-ready** for adding new role types

### **3. Improved Developer Experience**

- **Clearer API structure** for frontend developers
- **Better separation of concerns** between different user types
- **Easier to understand** and work with

---

## ⚠️ **Breaking Changes Summary**

### **Changed Endpoints:**

- All staff endpoints moved from `/users/staff/*` to `/staff/*`
- All admin endpoints moved from `/users/admin/*` to `/admin/*`
- Profile endpoints moved from `/users/profiles/*` to `/profiles/*`

---

## 🚀 **Migration Checklist**

### **Frontend Updates Required:**

- [ ] **Update API endpoints** in all service files
- [ ] **Update API calls** to use new endpoint structure
- [ ] **Test all CRUD operations** for staff and admin
- [ ] **Update profile management** to use new `/profiles` endpoints
- [ ] **Update error handling** for new API responses
- [ ] **Update any hardcoded endpoint references** in components
- [ ] **Update API documentation** if maintained separately
- [ ] **Test all existing functionality** with new endpoints

### **Testing Requirements:**

- [ ] **Staff CRUD operations** - Create, Read, Update, Delete
- [ ] **Admin CRUD operations** - Create, Read, Update, Delete
- [ ] **Profile management** - Get and update user profiles
- [ ] **Role assignment** - Ensure role assignment still works
- [ ] **Center assignment** - Ensure center assignment still works
- [ ] **Error handling** - Test error responses and validation
- [ ] **Integration testing** - Test complete user flows
- [ ] **Performance testing** - Ensure no performance degradation

---

## 📞 **Support & Questions**

If you encounter any issues during the migration or have questions about the new API structure, please:

1. **Check this documentation** for the specific change you're implementing
2. **Review the API responses** to understand the new data structure
3. **Test with the new endpoints** to ensure compatibility
4. **Contact the backend team** for any clarification needed

---

## 🎉 **Conclusion**

This migration brings significant improvements to the codebase:

- **Cleaner architecture** with proper module separation
- **Better API organization** with dedicated endpoints
- **Improved maintainability** for future development
- **Consistent patterns** across all modules

The migration is designed to be straightforward, with most changes involving updating endpoint URLs. The core functionality remains the same, but with a much cleaner and more maintainable structure.

**Happy coding! 🚀**
