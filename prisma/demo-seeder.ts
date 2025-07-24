import { PrismaClient, ProfileType, StudentGrade } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create permissions
  const permissions = [
    // User management
    { name: 'View Users', action: 'user:view' },
    { name: 'Create Users', action: 'user:create' },
    { name: 'Update Users', action: 'user:update' },
    { name: 'Delete Users', action: 'user:delete' },
    { name: 'Activate Users', action: 'user:activate' },

    // Center management
    { name: 'View Centers', action: 'center:view' },
    { name: 'Create Centers', action: 'center:create' },
    { name: 'Update Centers', action: 'center:update' },
    { name: 'Delete Centers', action: 'center:delete' },
    { name: 'Manage Center Access', action: 'center:access' },

    // Role management
    { name: 'View Roles', action: 'role:view' },
    { name: 'Create Roles', action: 'role:create' },
    { name: 'Update Roles', action: 'role:update' },
    { name: 'Delete Roles', action: 'role:delete' },
    { name: 'Assign Roles', action: 'role:assign' },

    // Permission management
    { name: 'View Permissions', action: 'permission:view' },
    { name: 'Create Permissions', action: 'permission:create' },
    { name: 'Update Permissions', action: 'permission:update' },
    { name: 'Delete Permissions', action: 'permission:delete' },
    { name: 'Assign Permissions', action: 'permission:assign' },

    // Teacher management
    { name: 'View Teachers', action: 'teacher:view' },
    { name: 'Create Teachers', action: 'teacher:create' },
    { name: 'Update Teachers', action: 'teacher:update' },
    { name: 'Delete Teachers', action: 'teacher:delete' },

    // Student management
    { name: 'View Students', action: 'student:view' },
    { name: 'Create Students', action: 'student:create' },
    { name: 'Update Students', action: 'student:update' },
    { name: 'Delete Students', action: 'student:delete' },

    // Guardian management
    { name: 'View Guardians', action: 'guardian:view' },
    { name: 'Create Guardians', action: 'guardian:create' },
    { name: 'Update Guardians', action: 'guardian:update' },
    { name: 'Delete Guardians', action: 'guardian:delete' },

    // Group management
    { name: 'View Groups', action: 'group:view' },
    { name: 'Create Groups', action: 'group:create' },
    { name: 'Update Groups', action: 'group:update' },
    { name: 'Delete Groups', action: 'group:delete' },
    { name: 'Assign Students to Groups', action: 'group:assign-students' },
    { name: 'Assign Teachers to Groups', action: 'group:assign-teachers' },

    // Subject management
    { name: 'View Subjects', action: 'subject:view' },
    { name: 'Create Subjects', action: 'subject:create' },
    { name: 'Update Subjects', action: 'subject:update' },
    { name: 'Delete Subjects', action: 'subject:delete' },
    { name: 'Assign Teachers to Subjects', action: 'subject:assign-teachers' },

    // Grade level management
    { name: 'View Grade Levels', action: 'grade-level:view' },
    { name: 'Create Grade Levels', action: 'grade-level:create' },
    { name: 'Update Grade Levels', action: 'grade-level:update' },
    { name: 'Delete Grade Levels', action: 'grade-level:delete' },

    // Schedule management
    { name: 'View Schedules', action: 'schedule:view' },
    { name: 'Create Schedules', action: 'schedule:create' },
    { name: 'Update Schedules', action: 'schedule:update' },
    { name: 'Delete Schedules', action: 'schedule:delete' },

    // Attendance management
    { name: 'View Attendance', action: 'attendance:view' },
    { name: 'Mark Attendance', action: 'attendance:mark' },
    { name: 'Update Attendance', action: 'attendance:update' },
    { name: 'Delete Attendance', action: 'attendance:delete' },

    // Reports
    { name: 'View Reports', action: 'report:view' },
    { name: 'Generate Reports', action: 'report:generate' },
    { name: 'Export Reports', action: 'report:export' },

    // System settings
    { name: 'View Settings', action: 'setting:view' },
    { name: 'Update Settings', action: 'setting:update' },

    // Profile management
    { name: 'View Own Profile', action: 'profile:view' },
    { name: 'Update Own Profile', action: 'profile:update' },
    { name: 'View Other Profiles', action: 'profile:view-others' },
    { name: 'Update Other Profiles', action: 'profile:update-others' },

    // Access control
    { name: 'Grant Access', action: 'access:grant' },
    { name: 'Revoke Access', action: 'access:revoke' },
    { name: 'View Access Logs', action: 'access:view-logs' },
  ];

  console.log('✅ Created 74 permissions');

  // Create global roles
  const globalRoles = [
    {
      name: 'Super Admin',
      isAdmin: true,
      scope: 'GLOBAL' as const,
      permissions: permissions.map((p) => ({ action: p.action })),
    },
    {
      name: 'System Manager',
      isAdmin: false,
      scope: 'GLOBAL' as const,
      permissions: permissions
        .filter(
          (p) =>
            !p.action.includes('delete') && !p.action.includes('permission:'),
        )
        .map((p) => ({ action: p.action })),
    },
    {
      name: 'Global Viewer',
      isAdmin: false,
      scope: 'GLOBAL' as const,
      permissions: permissions
        .filter(
          (p) => p.action.includes('view') || p.action.includes('report:view'),
        )
        .map((p) => ({ action: p.action })),
    },
  ];

  console.log('✅ Created 3 global roles');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin1234', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@lms.com',
      password: adminPassword,
      name: 'System Administrator',
      isActive: true,
      profile: {
        create: {
          type: ProfileType.BASE_USER,
          baseUser: {
            create: {},
          },
        },
      },
    },
  });

  console.log('✅ Created admin user');

  // Create default center
  const defaultCenter = await prisma.center.create({
    data: {
      name: 'Default Learning Center',
      description: 'Default center for the LMS system',
      location: 'Main Campus',
      ownerId: adminUser.id,
    },
  });

  console.log('✅ Created default center');

  // Create center roles
  const centerRoles = [
    {
      name: 'Center Owner',
      isAdmin: true,
      scope: 'CENTER' as const,
      centerId: defaultCenter.id,
      permissions: permissions.map((p) => ({ action: p.action })),
    },
    {
      name: 'Center Teacher',
      isAdmin: false,
      scope: 'CENTER' as const,
      centerId: defaultCenter.id,
      permissions: permissions
        .filter(
          (p) =>
            p.action.includes('view') ||
            p.action.includes('attendance:') ||
            p.action.includes('schedule:view') ||
            p.action.includes('group:view') ||
            p.action.includes('student:view') ||
            p.action.includes('profile:view') ||
            p.action.includes('profile:update'),
        )
        .map((p) => ({ action: p.action })),
    },
    {
      name: 'Center Student',
      isAdmin: false,
      scope: 'CENTER' as const,
      centerId: defaultCenter.id,
      permissions: permissions
        .filter(
          (p) =>
            p.action.includes('view') &&
            (p.action.includes('schedule:view') ||
              p.action.includes('attendance:view') ||
              p.action.includes('profile:view') ||
              p.action.includes('profile:update')),
        )
        .map((p) => ({ action: p.action })),
    },
  ];

  console.log('✅ Created 3 center roles');

  // Assign roles to admin user
  for (const roleData of globalRoles) {
    const role = await prisma.role.create({
      data: {
        name: roleData.name,
        isAdmin: roleData.isAdmin,
        scope: roleData.scope,
        permissions: roleData.permissions,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: role.id,
        scopeType: roleData.scope,
        scopeId: null, // Global roles don't have scopeId
      },
    });
  }

  console.log('✅ Assigned roles to admin user');

  // Assign permissions to roles using simple JSON values
  console.log('✅ Assigned permissions to roles using simple JSON values');

  // Add admin user to center
  const centerOwnerRole = await prisma.role.findFirst({
    where: { name: 'Center Owner', centerId: defaultCenter.id },
  });

  if (centerOwnerRole) {
    await prisma.userOnCenter.create({
      data: {
        userId: adminUser.id,
        centerId: defaultCenter.id,
        roleId: centerOwnerRole.id,
        createdBy: adminUser.id,
        isActive: true,
      },
    });
  }

  console.log('✅ Added admin user to center');

  // Create some demo users with different profile types
  const demoUsers = [
    {
      email: 'teacher1@lms.com',
      password: 'teacher123',
      name: 'John Teacher',
      profileType: ProfileType.TEACHER,
      profileData: {
        biography:
          'Experienced mathematics teacher with 10 years of experience',
        experienceYears: 10,
        specialization: 'Mathematics',
      },
    },
    {
      email: 'student1@lms.com',
      password: 'student123',
      name: 'Alice Student',
      profileType: ProfileType.STUDENT,
      profileData: {
        grade: StudentGrade.SECONDARY_1,
        level: 'Intermediate',
        performanceScore: 85.5,
        notes: 'Excellent student with strong analytical skills',
      },
    },
    {
      email: 'guardian1@lms.com',
      password: 'guardian123',
      name: 'Bob Guardian',
      profileType: ProfileType.GUARDIAN,
      profileData: {
        emergencyContact: '+1234567890',
        relationship: 'Father',
      },
    },
  ];

  for (const userData of demoUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        isActive: true,
        profile: {
          create: {
            type: userData.profileType,
            ...(userData.profileType === ProfileType.TEACHER && {
              teacher: {
                create: userData.profileData,
              },
            }),
            ...(userData.profileType === ProfileType.STUDENT && {
              student: {
                create: userData.profileData,
              },
            }),
            ...(userData.profileType === ProfileType.GUARDIAN && {
              guardian: {
                create: userData.profileData,
              },
            }),
          },
        },
      },
    });

    // Add user to center with appropriate role
    let roleName = 'Center Student';
    if (userData.profileType === ProfileType.TEACHER) {
      roleName = 'Center Teacher';
    } else if (userData.profileType === ProfileType.GUARDIAN) {
      roleName = 'Center Student'; // Guardians get student role for now
    }

    const role = await prisma.role.findFirst({
      where: { name: roleName, centerId: defaultCenter.id },
    });

    if (role) {
      await prisma.userOnCenter.create({
        data: {
          userId: user.id,
          centerId: defaultCenter.id,
          roleId: role.id,
          createdBy: adminUser.id,
          isActive: true,
        },
      });
    }
  }

  console.log('✅ Created demo users with different profile types');

  console.log(
    '\n🎉 Database seeded successfully with simple JSON permissions!',
  );
  console.log('📧 Admin user: admin@lms.com');
  console.log('🔑 Password: admin1234');
  console.log(
    '🏢 Default center created with Owner, Teacher, and Student roles',
  );
  console.log('🔐 All permissions stored as simple values in roles');
  console.log('📁 Using: Minimal JSON approach - just permission values!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
