import { PrismaClient } from '@prisma/client';
import { RoleScope } from '../src/access-control/constants/rolescope';
import {
  ALL_USER_PERMISSIONS,
  ALL_ADMIN_PERMISSIONS,
  OWNER_PERMISSIONS,
  TEACHER_PERMISSIONS,
  STUDENT_PERMISSIONS,
} from '../src/access-control/constants/permissions';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create all permissions (user + admin)
  const allPermissions = [...ALL_USER_PERMISSIONS, ...ALL_ADMIN_PERMISSIONS];

  const permissionRecords = await Promise.all(
    allPermissions.map((perm) =>
      prisma.permission.upsert({
        where: { action: perm.action },
        update: {},
        create: {
          action: perm.action,
          name: perm.name,
          isAdmin: perm.isAdmin,
        },
      }),
    ),
  );

  console.log(`✅ Created ${permissionRecords.length} permissions`);

  // 2. Create global roles
  const globalRoles = [
    { name: 'Admin', isAdmin: true },
    { name: 'SystemAdmin', isAdmin: true },
    { name: 'SupportAgent', isAdmin: true },
  ];

  const globalRoleRecords = await Promise.all(
    globalRoles.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: {
          name: role.name,
          scope: RoleScope.GLOBAL,
          isAdmin: role.isAdmin,
        },
      }),
    ),
  );

  console.log(`✅ Created ${globalRoleRecords.length} global roles`);

  // 3. Create a center
  const adminPassword = await bcrypt.hash('admin1234', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@lms.com' },
    update: {},
    create: {
      email: 'admin@lms.com',
      password: adminPassword,
      name: 'Admin User',
      isActive: true,
    },
  });

  console.log('✅ Created admin user');

  const center = await prisma.center.upsert({
    where: { id: 'default-center-id' },
    update: {},
    create: {
      id: 'default-center-id',
      name: 'Default Center',
      owner: { connect: { id: adminUser.id } },
    },
  });

  console.log('✅ Created default center');

  // 4. Create center roles with new naming convention
  const centerRoles = [
    { name: 'Owner', isAdmin: false },
    { name: 'Teacher', isAdmin: false },
    { name: 'Student', isAdmin: false },
  ];

  const centerRoleRecords = await Promise.all(
    centerRoles.map((role) =>
      prisma.role.upsert({
        where: { name: role.name, centerId: center.id },
        update: {},
        create: {
          name: role.name,
          scope: RoleScope.CENTER,
          centerId: center.id,
          isAdmin: role.isAdmin,
          metadata: {
            description: `${role.name} role for center`,
            isDefault: true,
          },
        },
      }),
    ),
  );

  console.log(`✅ Created ${centerRoleRecords.length} center roles`);

  // 5. Assign global Admin role to admin user
  const existingGlobalRole = await prisma.userRole.findFirst({
    where: {
      userId: adminUser.id,
      roleId: globalRoleRecords.find((r) => r.name === 'Admin')!.id,
      scopeType: RoleScope.GLOBAL,
    },
  });

  if (!existingGlobalRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: globalRoleRecords.find((r) => r.name === 'Admin')!.id,
        scopeType: RoleScope.GLOBAL,
        scopeId: null,
      },
    });
  }

  // 6. Assign center Owner role to admin user
  const existingCenterRole = await prisma.userRole.findFirst({
    where: {
      userId: adminUser.id,
      roleId: centerRoleRecords.find((r) => r.name === 'Owner')!.id,
      scopeType: RoleScope.CENTER,
      scopeId: center.id,
    },
  });

  if (!existingCenterRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: centerRoleRecords.find((r) => r.name === 'Owner')!.id,
        scopeType: RoleScope.CENTER,
        scopeId: center.id,
      },
    });
  }

  console.log('✅ Assigned roles to admin user');

  // 7. Assign permissions to roles using JSON
  const adminRoleId = globalRoleRecords.find((r) => r.name === 'Admin')!.id;
  const systemAdminRoleId = globalRoleRecords.find(
    (r) => r.name === 'SystemAdmin',
  )!.id;
  const supportRoleId = globalRoleRecords.find(
    (r) => r.name === 'SupportAgent',
  )!.id;

  const ownerRoleId = centerRoleRecords.find((r) => r.name === 'Owner')!.id;
  const teacherRoleId = centerRoleRecords.find((r) => r.name === 'Teacher')!.id;
  const studentRoleId = centerRoleRecords.find((r) => r.name === 'Student')!.id;

  // Admin gets ALL permissions
  const adminPermissions = permissionRecords.map((perm) => perm.action);

  await prisma.role.update({
    where: { id: adminRoleId },
    data: { permissions: adminPermissions },
  });

  // SystemAdmin gets admin permissions
  const systemAdminPermissions = permissionRecords
    .filter((p) => p.isAdmin)
    .map((perm) => perm.action);

  await prisma.role.update({
    where: { id: systemAdminRoleId },
    data: { permissions: systemAdminPermissions },
  });

  // SupportAgent gets support + user permissions
  const supportPermissions = permissionRecords
    .filter(
      (p) => p.action.includes('support:') || p.action.includes('user:view'),
    )
    .map((perm) => perm.action);

  await prisma.role.update({
    where: { id: supportRoleId },
    data: { permissions: supportPermissions },
  });

  // Owner gets all center permissions (using new constants)
  const ownerPermissions = permissionRecords
    .filter((p) => OWNER_PERMISSIONS.includes(p.action))
    .map((perm) => perm.action);

  await prisma.role.update({
    where: { id: ownerRoleId },
    data: { permissions: ownerPermissions },
  });

  // Teacher gets teacher permissions (using new constants)
  const teacherPermissions = permissionRecords
    .filter((p) => TEACHER_PERMISSIONS.includes(p.action))
    .map((perm) => perm.action);

  await prisma.role.update({
    where: { id: teacherRoleId },
    data: { permissions: teacherPermissions },
  });

  // Student gets student permissions (using new constants)
  const studentPermissions = permissionRecords
    .filter((p) => STUDENT_PERMISSIONS.includes(p.action))
    .map((perm) => perm.action);

  await prisma.role.update({
    where: { id: studentRoleId },
    data: { permissions: studentPermissions },
  });

  console.log('✅ Assigned permissions to roles using simple JSON values');

  // 8. Add admin user to center as Owner
  await prisma.userOnCenter.create({
    data: {
      userId: adminUser.id,
      centerId: center.id,
      roleId: ownerRoleId,
      createdBy: adminUser.id,
    },
  });

  console.log('✅ Added admin user to center');

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
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
