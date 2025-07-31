# 🎯 Database Seeder

This comprehensive database seeder creates realistic test data for the LMS application, setting up the complete role hierarchy, permissions, centers, and users for testing.

## 🚀 Quick Start

```bash
# Run the seeder
npm run seed
```

## 📊 What Gets Created

### 🔐 **Roles & Permissions**

- **Super Administrator**: No constraints, sees everything
- **Global Administrator**: Full constraints, requires explicit grants
- **Center Administrator**: No constraints within their center
- **Regular User**: Fully constrained, requires permissions and access grants
- **All Permissions**: Complete permission set from the permissions configuration

### 🏫 **Centers (4 total)**

1. **Bright Future Academy** (Cairo)
2. **Knowledge Hub Center** (Alexandria)
3. **Elite Education Institute** (Giza)
4. **Community Learning Center** (Luxor)

### 👥 **Users (26 total)**

#### **Global Admins**

- `admin@lms.com` / `password123` - System Administrator
- `superadmin@lms.com` / `password123` - Super Administrator

#### **Center Owners**

- `owner1@brightfuture.com` / `password123` - Bright Future Academy Owner
- `owner2@knowledgehub.com` / `password123` - Knowledge Hub Center Owner
- `owner3@elite.edu` / `password123` - Elite Education Institute Owner
- `owner4@community.edu` / `password123` - Community Learning Center Owner

#### **Teachers**

- `teacher1@brightfuture.com` / `password123` - Sarah Johnson
- `teacher2@brightfuture.com` / `password123` - Michael Brown
- `teacher3@knowledgehub.com` / `password123` - Emily Davis
- `teacher4@knowledgehub.com` / `password123` - David Wilson
- `teacher5@elite.edu` / `password123` - Lisa Anderson
- `teacher6@community.edu` / `password123` - Robert Taylor

#### **Students**

- `student1@brightfuture.com` / `password123` - Omar Ahmed
- `student2@brightfuture.com` / `password123` - Nour Hassan
- `student3@knowledgehub.com` / `password123` - Youssef Ali
- `student4@knowledgehub.com` / `password123` - Mariam Khalil
- `student5@elite.edu` / `password123` - Karim Mahmoud
- `student6@community.edu` / `password123` - Layla Ibrahim

#### **Managers/Assistants**

- `manager1@brightfuture.com` / `password123` - Hassan Manager
- `manager2@knowledgehub.com` / `password123` - Nadia Manager
- `assistant1@elite.edu` / `password123` - Samir Assistant
- `assistant2@community.edu` / `password123` - Rania Assistant

#### **Test Users**

- `deactivated@lms.com` / `password123` - Globally deactivated user
- `center-deactivated@lms.com` / `password123` - Center-specific deactivated user
- `regular@lms.com` / `password123` - Regular user with basic access

## 🔐 **Role Hierarchy & Access Control**

### **Super Administrator (SUPER_ADMIN)**

- **Scope**: Global
- **Constraints**: **NONE** - sees everything
- **Access Control**: No permissions, no AdminCenterAccess, no UserAccess needed
- **Users**: `superadmin@lms.com`

### **Administrator (ADMIN)**

- **Scope**: Global
- **Constraints**: **FULL** - constrained by SuperAdmin
- **Access Control**: Needs permissions + AdminCenterAccess + UserAccess
- **Users**: `admin@lms.com`

### **Center Administrator (CENTER_ADMIN)**

- **Scope**: Center-specific
- **Constraints**: **NONE within their center** - sees everything
- **Access Control**: No permissions needed within center, no UserAccess needed
- **Users**: All center owners

### **Regular User (USER)**

- **Scope**: Center-specific
- **Constraints**: **FULL** - fully constrained
- **Access Control**: Needs permissions + UserAccess
- **Users**: Teachers, students, managers, assistants

## 🧪 **Testing Scenarios**

### **1. Super Admin Testing**

```bash
# Login as super admin
POST /auth/login
{
  "email": "superadmin@lms.com",
  "password": "password123"
}
```

**Test:**

- View all centers, users, teachers, students
- Access any center's data (switch between centers)
- Create new centers and assign owners
- Manage global roles and permissions
- Test center-specific features from any center

### **2. Center Owner Testing**

```bash
# Login as center owner
POST /auth/login
{
  "email": "owner1@brightfuture.com",
  "password": "password123"
}
```

**Test:**

- View center-specific data only
- Manage teachers and students within their center
- Create groups and subjects for their center
- Schedule classes for their center

### **3. Teacher Testing**

```bash
# Login as teacher
POST /auth/login
{
  "email": "teacher1@brightfuture.com",
  "password": "password123"
}
```

**Test:**

- View assigned students and groups
- Mark attendance
- View schedules
- Access limited features based on permissions

### **4. Student Testing**

```bash
# Login as student
POST /auth/login
{
  "email": "student1@brightfuture.com",
  "password": "password123"
}
```

**Test:**

- View schedules and attendance
- Access limited features based on permissions

### **5. User Activation Testing**

**Global Deactivation:**

```bash
# Deactivate user globally (cannot login to any center)
PATCH /users/{userId}/activate
{
  "isActive": false,
  "scopeType": "ADMIN"
}
```

**Center-Specific Deactivation:**

```bash
# Deactivate user in specific center only
PATCH /users/{userId}/activate
{
  "isActive": false,
  "scopeType": "CENTER",
  "centerId": "center-id-123"
}
```

**Check Activation Status:**

```bash
# Get user's activation status across all centers
GET /users/{userId}/activation-status
```

## 📈 **Data Statistics**

After running the seeder, you'll have:

- **26 Users** with different roles and permissions
- **4 Centers** with complete academic structures
- **6 Teachers** with realistic profiles
- **6 Students** with performance data
- **4 Managers/Assistants** with administrative roles
- **4 Center Owners** with full center access
- **2 Global Admins** with system-wide access
- **3 Test Users** for special scenarios
- **Complete Permission Set** covering all features
- **Role Hierarchy** with proper constraints
- **Activity Logs** for all created entities

## 🔄 **Resetting Data**

To clear all data and start fresh:

```bash
# The seeder automatically clears existing data
npm run seed
```

## 🛠 **Customization**

You can modify `src/database/seeder.ts` to:

- Add more centers, users, or data
- Change the data distribution
- Modify permissions and roles
- Adjust academic structures
- Add more test scenarios

## 🚨 **Important Notes**

1. **All users have the same password**: `password123`
2. **Data is realistic but fictional** - no real personal information
3. **Seeder clears existing data** - backup if needed
4. **Test in development only** - never run on production
5. **Role constraints are enforced** through the access control system
6. **Activity logs are created** for all seeding operations

## 🎯 **Next Steps**

After seeding:

1. **Start the application**: `npm run start:dev`
2. **Test different user roles** using the login credentials above
3. **Explore the API endpoints** with the populated data
4. **Test access control** by switching between users
5. **Verify scope-based filtering** works correctly
6. **Test permission enforcement** at controller level
7. **Verify activity logging** captures all events

## 🔍 **Verification**

To verify the seeder worked correctly:

```bash
# Check if users were created
GET /users

# Check if centers were created
GET /centers

# Check if roles were created
GET /roles

# Check if permissions were created
GET /access-control/permissions

# Check activity logs
GET /activity-logs
```

Happy testing! 🎉
