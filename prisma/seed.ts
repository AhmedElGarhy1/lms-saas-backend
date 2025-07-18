import { PrismaClient } from '@prisma/client';
import { RoleScope } from '../src/access-control/dto/create-role.dto';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Create permissions
  const permissions = [
    'user:view',
    'user:update',
    'center:manage',
    'payment:view',
    'student:view',
    'support:handle',
    // Schedules module permissions
    'schedules:create',
    'schedules:read',
    'schedules:update',
    'schedules:delete',
  ];
  const permissionRecords = await Promise.all(
    permissions.map((action) =>
      prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action },
      }),
    ),
  );

  // 2. Create global roles
  const globalRoles = [
    { name: 'Admin', isPublic: false },
    { name: 'SupportAgent', isPublic: false },
    { name: 'Teacher', isPublic: true },
  ];
  const globalRoleRecords = await Promise.all(
    globalRoles.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: {
          name: role.name,
          scope: RoleScope.GLOBAL,
          isPublic: role.isPublic,
        },
      }),
    ),
  );

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
  const center = await prisma.center.upsert({
    where: { id: 'default-center-id' }, // Use a static id for the default center
    update: {},
    create: {
      id: 'default-center-id',
      name: 'Default Center',
      owner: { connect: { id: adminUser.id } },
    },
  });

  // 4. Create internal (center) roles
  const centerRoles = [
    { name: 'Accountant', isPublic: false },
    { name: 'Teacher', isPublic: true },
    { name: 'Assistant', isPublic: true },
  ];
  const centerRoleRecords = await Promise.all(
    centerRoles.map((role) =>
      prisma.role.upsert({
        where: { name: `${role.name}_${center.id}` },
        update: {},
        create: {
          name: `${role.name}_${center.id}`,
          scope: RoleScope.CENTER,
          centerId: center.id,
          isPublic: role.isPublic,
        },
      }),
    ),
  );

  // 5. Create a default admin user
  // This block is now redundant as adminUser is created above
  // const adminPassword = await bcrypt.hash('admin1234', 10);
  // const adminUser = await prisma.user.upsert({
  //   where: { email: 'admin@lms.com' },
  //   update: {},
  //   create: {
  //     email: 'admin@lms.com',
  //     password: adminPassword,
  //     name: 'Admin User',
  //     isActive: true,
  //   },
  // });

  // 6. Assign global Admin role to admin user
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: globalRoleRecords.find((r) => r.name === 'Admin')!.id,
      scopeType: RoleScope.GLOBAL,
      scopeId: null,
    },
  });

  // 7. Assign center Accountant role to admin user
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: centerRoleRecords.find((r) => r.name.startsWith('Accountant'))!
        .id,
      scopeType: RoleScope.CENTER,
      scopeId: center.id,
    },
  });

  // 8. Assign permissions to roles (example: Admin gets all, Accountant gets payment:view, student:view)
  const adminRoleId = globalRoleRecords.find((r) => r.name === 'Admin')!.id;
  for (const perm of permissionRecords) {
    await prisma.rolePermission.create({
      data: { roleId: adminRoleId, permissionId: perm.id },
    });
  }
  const accountantRoleId = centerRoleRecords.find((r) =>
    r.name.startsWith('Accountant'),
  )!.id;
  for (const permName of ['payment:view', 'student:view']) {
    const perm = permissionRecords.find((p) => p.action === permName)!;
    await prisma.rolePermission.create({
      data: { roleId: accountantRoleId, permissionId: perm.id },
    });
  }

  // 9. Example: assign a user-specific override
  await prisma.userPermission.create({
    data: {
      userId: adminUser.id,
      permissionId: permissionRecords.find(
        (p) => p.action === 'support:handle',
      )!.id,
      scopeType: RoleScope.CENTER,
      scopeId: center.id,
    },
  });

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
