# 🎯 Demo Data Seeder

This comprehensive demo seeder creates realistic test data for the LMS application, allowing you to explore all features with populated data.

## 🚀 Quick Start

```bash
# Run the demo seeder
npm run demo:seed
```

## 📊 What Gets Created

### 👥 **Users (36 total)**

- **2 Global Admins**: `admin@lms.com`, `superadmin@lms.com` (access to all centers)
- **4 Center Owners**: One for each center
- **10 Teachers**: Multiple teachers per center, some work across centers
- **10 Students**: Multiple students per center
- **4 Guardians**: For student relationships
- **4 Managers/Assistants**: Administrative staff
- **2 Regular Users**: For testing basic access

### 🏫 **Centers (4 total)**

1. **Bright Future Academy** (Cairo)
2. **Knowledge Hub Center** (Alexandria)
3. **Elite Education Institute** (Giza)
4. **Community Learning Center** (Luxor)

### 🎭 **Roles & Permissions**

- **Global Roles**: Super Admin, Global User
- **Center Roles**: Owner, Teacher, Student (per center)
- **Permissions**: 50+ granular permissions covering all features

### 👨‍🏫 **Teachers (6 total)**

- Realistic profiles with experience, ratings, specializations
- Assigned to centers and subjects
- Connected to user accounts

### 👨‍🎓 **Students (6 total)**

- Grade levels, performance scores, attendance records
- Assigned to teachers and groups
- Connected to user accounts

### 👨‍👩‍👧‍👦 **Guardians (4 total)**

- Contact information and relationships
- Connected to students

### 📚 **Academic Structure**

- **Grade Levels**: 9 levels per center (Primary 1-6, Secondary 1-3)
- **Subjects**: 9 subjects per grade level (Math, Science, English, etc.)
- **Groups**: 2 groups per grade level
- **Class Sessions**: 50 scheduled sessions across all centers

### 📊 **Attendance Records**

- Realistic attendance data for all sessions
- Various statuses: Present, Absent, Late, Excused

## 🔐 **Access Control Setup**

### **Global Scope**

- `admin@lms.com` / `password123` - Super Admin (all permissions, access to all centers)
- `superadmin@lms.com` / `password123` - Super Admin (all permissions, access to all centers)

### **Multi-Center Users (Real-World Scenarios)**

**Teachers Working Across Centers:**

- `teacher1@brightfuture.com` / `password123` - Works at Bright Future Academy + Knowledge Hub Center
- `teacher3@knowledgehub.com` / `password123` - Works at Knowledge Hub Center + Elite Education Institute
- `teacher5@elite.edu` / `password123` - Works at Elite Education Institute + Community Learning Center

**Managers/Assistants:**

- `manager1@brightfuture.com` / `password123` - Senior manager at Bright Future Academy + Knowledge Hub Center
- `manager2@knowledgehub.com` / `password123` - Manager at Knowledge Hub Center only
- `assistant1@elite.edu` / `password123` - Assistant at Elite Education Institute
- `assistant2@community.edu` / `password123` - Assistant at Community Learning Center

### **User Activation Testing**

**Globally Deactivated User:**

- `deactivated@lms.com` / `password123` - Cannot login to ANY center (globally deactivated)

**Center-Specific Deactivated User:**

- `center-deactivated@lms.com` / `password123` - Can login but:
  - ❌ **Deactivated** in Bright Future Academy
  - ✅ **Active** in Knowledge Hub Center
  - ✅ **Active** in other centers

### **Center Scope**

Each center has its own access control:

**Bright Future Academy:**

- Owner: `owner1@brightfuture.com` / `password123`
- Teachers: `teacher1@brightfuture.com`, `teacher2@brightfuture.com`
- Students: `student1@brightfuture.com`, `student2@brightfuture.com`

**Knowledge Hub Center:**

- Owner: `owner2@knowledgehub.com` / `password123`
- Teachers: `teacher3@knowledgehub.com`, `teacher4@knowledgehub.com`
- Students: `student3@knowledgehub.com`, `student4@knowledgehub.com`

**Elite Education Institute:**

- Owner: `owner3@elite.edu` / `password123`
- Teachers: `teacher5@elite.edu`, `teacher6@community.edu`
- Students: `student5@elite.edu`, `student6@community.edu`

**Community Learning Center:**

- Owner: `owner4@community.edu` / `password123`
- Teachers: `teacher6@community.edu`
- Students: `student6@community.edu`

## 🧪 **Testing Scenarios**

### **1. Global Admin Testing**

```bash
# Login as global admin
POST /auth/login
{
  "email": "admin@lms.com",
  "password": "password123"
}
```

**Test:**

- View all centers, users, teachers, students
- Access any center's data (switch between centers)
- Create new centers and assign owners
- Manage global roles and permissions
- Test center-specific features from any center

### **2. User Activation Testing**

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

**Test Login Scenarios:**

```bash
# Try to login with globally deactivated user
POST /auth/login
{
  "email": "deactivated@lms.com",
  "password": "password123"
}
# Result: "Account is deactivated. Please contact administrator."

# Login with center-deactivated user (should work)
POST /auth/login
{
  "email": "center-deactivated@lms.com",
  "password": "password123"
}
# Result: Login successful, but user cannot access Bright Future Academy
```

**Test Center Access Validation:**

```bash
# Try to access center where user is deactivated
GET /centers/{centerId}/members
Headers:
  x-scope-type: CENTER
  x-center-id: {centerId}
Authorization: Bearer {center-deactivated-user-token}

# Result: 403 Forbidden - "User is deactivated in this center"

# Try to access center where user is active
GET /centers/{centerId}/members
Headers:
  x-scope-type: CENTER
  x-center-id: {centerId}
Authorization: Bearer {center-deactivated-user-token}

# Result: 200 OK - Access granted
```

### **🔐 Global Guard System**

The application uses a comprehensive global guard system configured in `app.module.ts`:

### **📋 API Endpoints with Activation Status**

**`/me` Endpoint:**

```json
{
  "centers": [
    {
      "center": { "id": "center-id", "name": "Center Name" },
      "roles": [...],
      "isActive": true  // Shows user's activation status in this center
    }
  ]
}
```

**`/users` Endpoint:**

```json
{
  "data": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "userType": "Teacher", // 'Teacher', 'Student', 'Guardian', or 'Base User'
      "teacherProfile": {
        "id": "teacher-profile-id",
        "specialization": "Mathematics",
        "experience": 5,
        "qualifications": "PhD in Mathematics",
        "bio": "Experienced math teacher"
      },
      "studentProfile": null,
      "guardianProfile": null,
      "centers": [
        {
          "id": "center-id",
          "name": "Center Name",
          "role": { "id": "role-id", "name": "Role Name" },
          "isActive": true // Shows user's activation status in this center
        }
      ]
    }
  ]
}
```

**`/users/{id}/activation-status` Endpoint:**

```json
{
  "userId": "user-id",
  "globalActive": true,
  "centerActivations": [
    {
      "centerId": "center-id",
      "centerName": "Center Name",
      "isActive": true
    }
  ]
}
```

```typescript
// Global Guards (executed in order):
1. JwtAuthGuard - JWT token validation
2. ThrottlerGuard - Rate limiting protection
3. ContextGuard - Context setting + center access validation
```

**Automatic Center Access Validation:**

- ✅ **No manual setup required**
- ✅ **ContextGuard** automatically validates center access
- ✅ **Works with any endpoint** that uses center scope
- ✅ **Consistent security** across the entire application

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
- Manage teachers and students
- Create groups and subjects
- Schedule classes

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
- Access limited features

## 📈 **Data Statistics**

After running the seeder, you'll have:

- **26 Users** with different roles and permissions
- **4 Centers** with complete academic structures
- **6 Teachers** with realistic profiles
- **6 Students** with performance data
- **4 Guardians** with relationships
- **36 Grade Levels** (9 per center)
- **324 Subjects** (9 subjects × 9 grades × 4 centers)
- **72 Groups** (2 groups × 9 grades × 4 centers)
- **50 Class Sessions** with scheduling
- **200+ Attendance Records** with realistic data
- **50+ Permissions** covering all features
- **15+ Roles** (global + per-center)

## 🔄 **Resetting Data**

To clear all data and start fresh:

```bash
# The seeder automatically clears existing data
npm run demo:seed
```

## 🛠 **Customization**

You can modify `prisma/demo-seeder.ts` to:

- Add more centers, users, or data
- Change the data distribution
- Modify permissions and roles
- Adjust academic structures

## 🚨 **Important Notes**

1. **All users have the same password**: `password123`
2. **Data is realistic but fictional** - no real personal information
3. **Seeder clears existing data** - backup if needed
4. **Test in development only** - never run on production

## 🎯 **Next Steps**

After seeding:

1. **Start the application**: `npm run start:dev`
2. **Test different user roles** using the login credentials above
3. **Explore the API endpoints** with the populated data
4. **Test access control** by switching between users
5. **Verify scope-based filtering** works correctly

Happy testing! 🎉
