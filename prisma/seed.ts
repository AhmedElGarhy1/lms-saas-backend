import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Define permissions (add more as you add features)
  const permissions = [
    'user:view',
    'user:update',
    'user:invite',
    'user:change-password',
    'center:manage',
    'lesson:create',
    'lesson:grade',
    'role:manage',
    // Add new permissions here as you add features
  ];
  const permissionRecords = await Promise.all(
    permissions.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  // Define roles
  const roles = ['Admin', 'Owner', 'Teacher', 'Assistant', 'User'];
  const roleRecords = await Promise.all(
    roles.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  // Map permissions to roles
  // Update this mapping as you add new permissions/features
  const rolePermissions: Record<string, string[]> = {
    Admin: permissions, // Admin gets all permissions
    Owner: [
      'user:view',
      'user:update',
      'user:invite',
      'center:manage',
      'lesson:create',
      'lesson:grade',
      'role:manage',
    ],
    Teacher: ['user:view', 'lesson:create', 'lesson:grade'],
    Assistant: [
      'user:view',
      'lesson:create', // Assistant can't grade lessons
    ],
    User: ['user:view', 'user:update', 'user:change-password'],
  };

  // Assign permissions to roles
  for (const roleName of roles) {
    const role = roleRecords.find((r) => r.name === roleName);
    if (!role) continue;
    const perms = rolePermissions[roleName] || [];
    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          set: permissionRecords
            .filter((p) => perms.includes(p.name))
            .map((p) => ({ id: p.id })),
        },
      },
    });
  }

  // Create a default center for admin assignment
  const center = await prisma.center.upsert({
    where: { name: 'Default Center' },
    update: {},
    create: { name: 'Default Center' },
  });

  // Create default admin user
  const adminEmail = 'admin@example.com';
  const adminPassword = await bcrypt.hash('Admin1234!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      name: 'Admin User',
      isActive: true,
    },
  });

  // Assign Admin role to admin user in Default Center
  const adminRole = roleRecords.find((r) => r.name === 'Admin');
  await prisma.userOnCenter.upsert({
    where: {
      userId_centerId_roleId: {
        userId: adminUser.id,
        centerId: center.id,
        roleId: adminRole!.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      centerId: center.id,
      roleId: adminRole!.id,
    },
  });

  // Set admin as the owner of the center
  await prisma.center.update({
    where: { id: center.id },
    data: { ownerId: adminUser.id },
  });

  console.log('Seed complete!');
  // TODO: When adding new features/endpoints, update permissions and rolePermissions above
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
