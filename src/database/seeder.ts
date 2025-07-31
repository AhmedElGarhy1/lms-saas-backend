import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Profile } from '@/modules/user/entities/profile.entity';
import { Center } from '@/modules/access-control/entities/center.entity';
import { Role } from '@/modules/access-control/entities/roles/role.entity';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { UserRole } from '@/modules/access-control/entities/roles/user-role.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { AdminCenterAccess } from '@/modules/access-control/entities/admin/admin-center-access.entity';
import { RoleTypeEnum } from '@/modules/access-control/constants/role-type.enum';
import {
  PERMISSIONS,
  ALL_PERMISSIONS,
  ADMIN_PERMISSIONS,
  USER_PERMISSIONS,
} from '@/modules/access-control/constants/permissions';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import {
  ActivityType,
  ActivityScope,
} from '@/shared/modules/activity-log/entities/activity-log.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(UserAccess)
    private readonly userAccessRepository: Repository<UserAccess>,
    @InjectRepository(AdminCenterAccess)
    private readonly adminCenterAccessRepository: Repository<AdminCenterAccess>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      // Clear existing data
      await this.clearData();

      // Create permissions
      await this.createPermissions();

      // Create roles
      await this.createRoles();

      // Create users first (needed for center owners)
      const users = await this.createUsers();

      // Create centers (with valid owner IDs)
      const centers = await this.createCenters(users);

      // Assign roles and permissions
      await this.assignRolesAndPermissions(users, centers);

      // Create activity logs
      await this.createActivityLogs(users, centers);

      this.logger.log('Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('Error during seeding:', error);
      throw error;
    }
  }

  private async clearData(): Promise<void> {
    this.logger.log('Clearing existing data...');

    // Clear in reverse dependency order to avoid foreign key constraint issues
    await this.activityLogService.clearAllLogs();

    // Use query builder to clear all data in proper order
    await this.userRoleRepository.createQueryBuilder().delete().execute();
    await this.userAccessRepository.createQueryBuilder().delete().execute();
    await this.adminCenterAccessRepository
      .createQueryBuilder()
      .delete()
      .execute();
    await this.permissionRepository.createQueryBuilder().delete().execute();
    await this.roleRepository.createQueryBuilder().delete().execute();
    await this.profileRepository.createQueryBuilder().delete().execute();
    // Delete centers before users (since centers reference users as owners)
    await this.centerRepository.createQueryBuilder().delete().execute();
    await this.userRepository.createQueryBuilder().delete().execute();

    this.logger.log('Existing data cleared successfully');
  }

  private async createPermissions(): Promise<void> {
    this.logger.log('Creating permissions...');

    const permissionEntities = ALL_PERMISSIONS.map((permission) => {
      return this.permissionRepository.create({
        action: permission.action,
        description: permission.name,
        isAdmin: permission.isAdmin,
      });
    });

    await this.permissionRepository.save(permissionEntities);
    this.logger.log(`Created ${permissionEntities.length} permissions`);
  }

  private async createRoles(): Promise<void> {
    this.logger.log('Creating roles...');

    const roles = [
      // Global roles
      {
        name: 'Super Administrator',
        type: RoleTypeEnum.SUPER_ADMIN,
        description: 'System owner with no constraints - sees everything',
        isAdmin: true,
        permissions: [],
      },
      {
        name: 'Global Administrator',
        type: RoleTypeEnum.ADMIN,
        description: 'System administrator with full constraints',
        isAdmin: true,
        permissions: [],
      },
      {
        name: 'Global User',
        type: RoleTypeEnum.USER,
        description: 'Regular user with full constraints',
        isAdmin: false,
        permissions: [],
      },
    ];

    const roleEntities = roles.map((role) => this.roleRepository.create(role));
    await this.roleRepository.save(roleEntities);
    this.logger.log(`Created ${roleEntities.length} global roles`);
  }

  private async createCenters(users: User[]): Promise<Center[]> {
    this.logger.log('Creating centers...');

    // Get center owner users (skip the first 2 which are global admins)
    const centerOwners = users.slice(2, 6); // 4 center owners

    const centers = [
      {
        name: 'Bright Future Academy',
        description: 'Premier educational institution in Cairo',
        ownerId: centerOwners[0].id,
        isActive: true,
      },
      {
        name: 'Knowledge Hub Center',
        description: 'Innovative learning center in Alexandria',
        ownerId: centerOwners[1].id,
        isActive: true,
      },
      {
        name: 'Elite Education Institute',
        description: 'Excellence in education in Giza',
        ownerId: centerOwners[2].id,
        isActive: true,
      },
      {
        name: 'Community Learning Center',
        description: 'Community-focused education in Luxor',
        ownerId: centerOwners[3].id,
        isActive: true,
      },
    ];

    const centerEntities = centers.map((center) =>
      this.centerRepository.create(center),
    );
    const savedCenters = await this.centerRepository.save(centerEntities);
    this.logger.log(`Created ${savedCenters.length} centers`);

    return savedCenters;
  }

  private async createUsers(): Promise<User[]> {
    this.logger.log('Creating users...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
      // Global Admins
      {
        email: 'admin@lms.com',
        password: hashedPassword,
        name: 'System Administrator',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'superadmin@lms.com',
        password: hashedPassword,
        name: 'Super Administrator',
        isActive: true,
        isEmailVerified: true,
      },

      // Center Owners
      {
        email: 'owner1@brightfuture.com',
        password: hashedPassword,
        name: 'Ahmed Hassan',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'owner2@knowledgehub.com',
        password: hashedPassword,
        name: 'Fatima Ali',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'owner3@elite.edu',
        password: hashedPassword,
        name: 'Mohammed Khalil',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'owner4@community.edu',
        password: hashedPassword,
        name: 'Aisha Mahmoud',
        isActive: true,
        isEmailVerified: true,
      },

      // Teachers
      {
        email: 'teacher1@brightfuture.com',
        password: hashedPassword,
        name: 'Sarah Johnson',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'teacher2@brightfuture.com',
        password: hashedPassword,
        name: 'Michael Brown',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'teacher3@knowledgehub.com',
        password: hashedPassword,
        name: 'Emily Davis',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'teacher4@knowledgehub.com',
        password: hashedPassword,
        name: 'David Wilson',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'teacher5@elite.edu',
        password: hashedPassword,
        name: 'Lisa Anderson',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'teacher6@community.edu',
        password: hashedPassword,
        name: 'Robert Taylor',
        isActive: true,
        isEmailVerified: true,
      },

      // Students
      {
        email: 'student1@brightfuture.com',
        password: hashedPassword,
        name: 'Omar Ahmed',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'student2@brightfuture.com',
        password: hashedPassword,
        name: 'Nour Hassan',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'student3@knowledgehub.com',
        password: hashedPassword,
        name: 'Youssef Ali',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'student4@knowledgehub.com',
        password: hashedPassword,
        name: 'Mariam Khalil',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'student5@elite.edu',
        password: hashedPassword,
        name: 'Karim Mahmoud',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'student6@community.edu',
        password: hashedPassword,
        name: 'Layla Ibrahim',
        isActive: true,
        isEmailVerified: true,
      },

      // Managers/Assistants
      {
        email: 'manager1@brightfuture.com',
        password: hashedPassword,
        name: 'Hassan Manager',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'manager2@knowledgehub.com',
        password: hashedPassword,
        name: 'Nadia Manager',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'assistant1@elite.edu',
        password: hashedPassword,
        name: 'Samir Assistant',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'assistant2@community.edu',
        password: hashedPassword,
        name: 'Rania Assistant',
        isActive: true,
        isEmailVerified: true,
      },

      // Test Users
      {
        email: 'deactivated@lms.com',
        password: hashedPassword,
        name: 'Deactivated User',
        isActive: false,
        isEmailVerified: true,
      },
      {
        email: 'center-deactivated@lms.com',
        password: hashedPassword,
        name: 'Center Deactivated User',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'regular@lms.com',
        password: hashedPassword,
        name: 'Regular User',
        isActive: true,
        isEmailVerified: true,
      },
    ];

    const userEntities = users.map((user) => this.userRepository.create(user));
    const savedUsers = await this.userRepository.save(userEntities);
    this.logger.log(`Created ${savedUsers.length} users`);

    return savedUsers;
  }

  private async assignRolesAndPermissions(
    users: User[],
    centers: Center[],
  ): Promise<void> {
    this.logger.log('Assigning roles and permissions...');

    // Get roles
    const superAdminRole = await this.roleRepository.findOne({
      where: { type: RoleTypeEnum.SUPER_ADMIN },
    });
    const adminRole = await this.roleRepository.findOne({
      where: { type: RoleTypeEnum.ADMIN },
    });
    const userRole = await this.roleRepository.findOne({
      where: { type: RoleTypeEnum.USER },
    });

    if (!superAdminRole || !adminRole || !userRole) {
      throw new Error('Required roles not found');
    }

    // Get permissions
    const allPermissions = await this.permissionRepository.find();
    const adminPermissions = allPermissions.filter((p) => p.isAdmin);
    const userPermissions = allPermissions.filter((p) => !p.isAdmin);

    // Create center-specific roles
    const centerRoles = [];
    for (const center of centers) {
      const centerAdminRole = this.roleRepository.create({
        name: `${center.name} Administrator`,
        type: RoleTypeEnum.CENTER_ADMIN,
        description: `Center administrator for ${center.name}`,
        isAdmin: true,
        centerId: center.id,
        permissions: [],
      });
      centerRoles.push(await this.roleRepository.save(centerAdminRole));
    }

    // Assign global roles
    const adminUser = users.find((u) => u.email === 'admin@lms.com');
    const superAdminUser = users.find((u) => u.email === 'superadmin@lms.com');
    const regularUser = users.find((u) => u.email === 'regular@lms.com');

    if (adminUser && adminRole) {
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: adminUser.id,
          roleId: adminRole.id,
        }),
      );
    }

    if (superAdminUser && superAdminRole) {
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: superAdminUser.id,
          roleId: superAdminRole.id,
        }),
      );
    }

    if (regularUser && userRole) {
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: regularUser.id,
          roleId: userRole.id,
        }),
      );
    }

    // Assign center-specific roles
    const centerOwners = users.filter((u) => u.email.includes('owner'));
    const teachers = users.filter((u) => u.email.includes('teacher'));
    const students = users.filter((u) => u.email.includes('student'));
    const managers = users.filter(
      (u) => u.email.includes('manager') || u.email.includes('assistant'),
    );

    // Assign center owners to their centers
    for (let i = 0; i < centerOwners.length && i < centers.length; i++) {
      const owner = centerOwners[i];
      const center = centers[i];
      const centerRole = centerRoles[i];

      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: owner.id,
          roleId: centerRole.id,
        }),
      );

      // Grant admin center access
      await this.adminCenterAccessRepository.save(
        this.adminCenterAccessRepository.create({
          adminUserId: owner.id,
          granterUserId: superAdminUser?.id || adminUser?.id,
        }),
      );
    }

    // Assign teachers to centers
    for (let i = 0; i < teachers.length && i < centers.length; i++) {
      const teacher = teachers[i];
      const center = centers[i];

      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: teacher.id,
          roleId: userRole.id,
        }),
      );

      // Grant user access to center
      await this.userAccessRepository.save(
        this.userAccessRepository.create({
          targetUserId: teacher.id,
          granterUserId: centerOwners[i]?.id || superAdminUser?.id,
        }),
      );
    }

    // Assign students to centers
    for (let i = 0; i < students.length && i < centers.length; i++) {
      const student = students[i];
      const center = centers[i];

      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: student.id,
          roleId: userRole.id,
        }),
      );

      // Grant user access to center
      await this.userAccessRepository.save(
        this.userAccessRepository.create({
          targetUserId: student.id,
          granterUserId: centerOwners[i]?.id || superAdminUser?.id,
        }),
      );
    }

    // Assign managers to centers
    for (let i = 0; i < managers.length && i < centers.length; i++) {
      const manager = managers[i];
      const center = centers[i];

      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: manager.id,
          roleId: userRole.id,
        }),
      );

      // Grant user access to center
      await this.userAccessRepository.save(
        this.userAccessRepository.create({
          targetUserId: manager.id,
          granterUserId: centerOwners[i]?.id || superAdminUser?.id,
        }),
      );
    }

    // Special case: center-deactivated user (deactivated in first center only)
    const centerDeactivatedUser = users.find(
      (u) => u.email === 'center-deactivated@lms.com',
    );
    if (centerDeactivatedUser && centers.length > 0) {
      // Assign to second center (active)
      if (centers.length > 1) {
        await this.userRoleRepository.save(
          this.userRoleRepository.create({
            userId: centerDeactivatedUser.id,
            roleId: userRole.id,
          }),
        );

        await this.userAccessRepository.save(
          this.userAccessRepository.create({
            targetUserId: centerDeactivatedUser.id,
            granterUserId: superAdminUser?.id,
          }),
        );
      }
    }

    this.logger.log('Roles and permissions assigned successfully');
  }

  private async createActivityLogs(
    users: User[],
    centers: Center[],
  ): Promise<void> {
    this.logger.log('Creating activity logs...');

    const superAdmin = users.find((u) => u.email === 'superadmin@lms.com');
    const admin = users.find((u) => u.email === 'admin@lms.com');

    if (!superAdmin || !admin) {
      this.logger.warn(
        'Super admin or admin not found, skipping activity logs',
      );
      return;
    }

    // Log center creation activities
    for (const center of centers) {
      await this.activityLogService.logCenterActivity(
        ActivityType.CENTER_CREATED,
        'Center created during seeding',
        superAdmin.id,
        center.id,
        undefined,
        {
          centerName: center.name,
          centerId: center.id,
          seeder: true,
        },
      );
    }

    // Log user creation activities
    for (const user of users) {
      await this.activityLogService.logUserActivity(
        ActivityType.USER_CREATED,
        'User created during seeding',
        superAdmin.id,
        user.id,
        {
          userEmail: user.email,
          userName: user.name,
          seeder: true,
        },
      );
    }

    this.logger.log('Activity logs created successfully');
  }
}
