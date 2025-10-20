import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Profile, ProfileType } from '@/modules/user/entities/profile.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { ALL_PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import * as bcrypt from 'bcrypt';
import {
  getAllRoleDefinitions,
  createRandomRoles,
} from './factories/role-definitions';
import { CenterFactory } from './factories/center.factory';
import { faker } from '@faker-js/faker';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { CenterAccess } from '@/modules/access-control/entities/center-access.entity';
import { BranchAccess } from '@/modules/access-control/entities/branch-access.entity';
import { Role } from '@/modules/access-control/entities/role.entity';
import { UserRole } from '@/modules/access-control/entities/user-role.entity';
import { RolePermission } from '@/modules/access-control/entities/role-permission.entity';
import { Branch } from '@/modules/centers/entities/branch.entity';
import { DefaultRoles } from '@/modules/access-control/constants/roles';
import { PermissionScope } from '@/modules/access-control/constants/permissions';
import { SeederException } from '@/shared/common/exceptions/custom.exceptions';

// Helper function to generate phone numbers that fit within 20 character limit
const generateShortPhone = (): string => {
  const phone = faker.phone.number();
  return phone.length > 20 ? phone.substring(0, 20) : phone;
};

@Injectable()
export class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(UserAccess)
    private readonly userAccessRepository: Repository<UserAccess>,
    @InjectRepository(CenterAccess)
    private readonly centerAccessRepository: Repository<CenterAccess>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(BranchAccess)
    private readonly branchAccessRepository: Repository<BranchAccess>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly activityLogService: ActivityLogService,
    private readonly centersService: CentersService,
  ) {}

  private async synchronizeDatabase(): Promise<void> {
    this.logger.log('Synchronizing database schema...');

    try {
      // Get the data source and synchronize the schema
      const dataSource = this.userRepository.manager.connection;
      await dataSource.synchronize();
      this.logger.log('Database schema synchronized successfully');
    } catch (error) {
      this.logger.error('Error synchronizing database schema:', error);
      throw error;
    }
  }

  async seed(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      // Reset database completely for clean seeding
      await this.resetDatabase();

      // Create system user first (needed for createdBy field)
      const systemUser = await this.createSystemUser();

      // Create permissions
      await this.createPermissions();

      // Create users with profiles (needed for center owners)
      const users = await this.createUsers(systemUser.id);

      // Create centers (with valid owner IDs)
      const centers = await this.createCenters(users, systemUser.id);

      // Create roles (after centers are created for center-specific roles)
      await this.createRoles(centers, systemUser.id);

      // Assign roles and permissions
      await this.assignRolesAndPermissions(users, centers, systemUser.id);

      // Create role permissions
      await this.createRolePermissions(users, centers, systemUser.id);

      // Create branches for centers
      const branches = await this.createBranches(centers, systemUser.id);

      // Create branch access for users
      await this.createBranchAccess(users, branches, centers, systemUser.id);

      // Create activity logs
      await this.createActivityLogs(users, centers, systemUser.id);

      this.logger.log('Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('Error during seeding:', error);
      throw error;
    }
  }

  private async createSystemUser(): Promise<User> {
    this.logger.log('Creating system user...');

    // Check if system user already exists
    let systemUser = await this.userRepository.findOne({
      where: { email: 'system@lms.com' },
    });

    if (systemUser) {
      this.logger.log('System user already exists, using existing user');
      return systemUser;
    }

    const hashedPassword = await bcrypt.hash('system123', 10);

    // Create system user using raw SQL to avoid circular dependencies
    systemUser = await this.userRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Generate UUIDs for both user and profile
        const userResult = await transactionalEntityManager.query(
          'SELECT gen_random_uuid() as id',
        );
        const profileResult = await transactionalEntityManager.query(
          'SELECT gen_random_uuid() as id',
        );

        const userUuid = userResult[0].id;
        const profileUuid = profileResult[0].id;

        // Temporarily disable foreign key constraints
        await transactionalEntityManager.query(
          'SET session_replication_role = replica',
        );

        // Insert user first
        await transactionalEntityManager.query(
          `INSERT INTO users (id, email, password, name, "isActive", "createdBy", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [
            userUuid,
            'system@lms.com',
            hashedPassword,
            'System User',
            true,
            userUuid, // createdBy is self for system user
          ],
        );

        // Insert profile with the correct user ID
        await transactionalEntityManager.query(
          `INSERT INTO profiles (id, "userId", type, address, "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [profileUuid, userUuid, ProfileType.ADMIN, 'System'],
        );

        // Re-enable foreign key constraints
        await transactionalEntityManager.query(
          'SET session_replication_role = DEFAULT',
        );

        // Return the user object
        const user = await transactionalEntityManager.findOne(User, {
          where: { id: userUuid },
        });
        if (!user) {
          throw new SeederException(
            `Failed to create system user with ID: ${userUuid}`,
          );
        }
        return user;
      },
    );

    this.logger.log('System user created successfully');
    return systemUser;
  }

  private async clearData(): Promise<void> {
    this.logger.log('Clearing existing data...');

    try {
      // Use CASCADE to handle foreign key constraints properly
      const tablesToClear = [
        'activity_logs',
        'branch_access',
        'branches',
        'role_permissions',
        'user_roles',
        'user_access',
        'center_access',
        'profiles',
        'users',
        'permissions',
        'roles',
        'refresh_tokens',
        'email_verifications',
        'password_reset_tokens',
        'centers',
      ];

      // Clear tables in reverse dependency order with CASCADE
      for (const table of tablesToClear) {
        try {
          // Check if table exists first
          const tableExists = await this.userRepository.manager.query(
            `SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = '${table}'
            )`,
          );

          if (tableExists[0].exists) {
            // Use TRUNCATE with CASCADE to handle foreign keys
            await this.userRepository.manager.query(
              `TRUNCATE TABLE ${table} CASCADE`,
            );
            this.logger.log(`Cleared table: ${table}`);
          } else {
            this.logger.warn(
              `Table ${table} doesn't exist, skipping clear operation`,
            );
          }
        } catch (error) {
          this.logger.warn(`Error clearing table ${table}:`, error.message);
          // Try DELETE as fallback
          try {
            await this.userRepository.manager.query(`DELETE FROM ${table}`);
            this.logger.log(`Cleared table: ${table} (using DELETE)`);
          } catch (deleteError) {
            this.logger.warn(
              `Could not clear table ${table}:`,
              deleteError.message,
            );
          }
        }
      }

      this.logger.log('Existing data cleared successfully');
    } catch (error) {
      this.logger.error('Error during data clearing:', error);
      // Continue with seeding even if clearing fails
      this.logger.warn('Continuing with seeding despite clearing errors...');
    }
  }

  private async resetDatabase(): Promise<void> {
    this.logger.log('Resetting database...');

    try {
      const dataSource = this.userRepository.manager.connection;

      // Drop all tables and recreate them
      await dataSource.dropDatabase();
      await dataSource.synchronize();

      this.logger.log('Database reset successfully');
    } catch (error) {
      this.logger.error('Error resetting database:', error);
      throw error;
    }
  }

  private async createPermissions(): Promise<void> {
    this.logger.log('Creating permissions...');

    const permissionEntities = ALL_PERMISSIONS.map((permission) => {
      return this.permissionRepository.create({
        name: (permission as any).name,
        action: (permission as any).action,
        description: (permission as any).name,
        scope: (permission as any).scope,
      });
    });

    await this.permissionRepository.save(permissionEntities);
    this.logger.log(`Created ${permissionEntities.length} permissions`);
  }

  private async createRoles(
    centers: Center[],
    createdBy: string,
  ): Promise<void> {
    this.logger.log('Creating roles...');

    // Get center IDs and names for center-specific roles
    const centerIds = centers.map((center) => center.id);

    // Get all role definitions (SYSTEM + ADMIN + CENTER-specific)
    const roleDefinitions = getAllRoleDefinitions(centerIds);

    // Add some random roles for variety
    const randomRoles = createRandomRoles(centerIds, 5);
    const allRoleDefinitions = [...roleDefinitions, ...randomRoles];

    const roleEntities = allRoleDefinitions.map((role) =>
      this.roleRepository.create({
        ...role,
        createdBy,
      }),
    );
    await this.roleRepository.save(roleEntities);

    // Log role creation summary
    const systemRoles = roleEntities.filter((r) => r.type === 'SYSTEM').length;
    const adminRoles = roleEntities.filter((r) => r.type === 'ADMIN').length;
    const centerRoles = roleEntities.filter((r) => r.type === 'CENTER').length;

    this.logger.log(`Created ${roleEntities.length} roles:`);
    this.logger.log(`- ${systemRoles} SYSTEM roles (global scope)`);
    this.logger.log(`- ${adminRoles} ADMIN roles (global scope)`);
    this.logger.log(`- ${centerRoles} CENTER roles (center-specific)`);
    this.logger.log(`- ${randomRoles.length} random roles for variety`);
  }

  private async createCenters(
    users: User[],
    createdBy: string,
  ): Promise<Center[]> {
    this.logger.log('Creating centers...');

    // Create 50 centers using the factory
    const centers = CenterFactory.createMixedCenters(10).map(
      (center, index) => ({
        ...center,
        name: center.name || `Center ${index + 1}`,
        description: center.description || `Educational center ${index + 1}`,
        createdBy: createdBy, // Use system user as creator
        phone: generateShortPhone(),
        email:
          center.email?.substring(0, 255) ||
          faker.internet.email().substring(0, 255),
        website:
          center.website?.substring(0, 255) ||
          faker.internet.url().substring(0, 255),
      }),
    );

    const savedCenters = await Promise.all(
      centers.map((center) =>
        this.centersService.createCenterForSeeder(center),
      ),
    );
    this.logger.log(`Created ${savedCenters.length} centers`);

    return savedCenters;
  }

  private async createUsers(createdBy: string): Promise<User[]> {
    this.logger.log('Creating users and profiles...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create system users first
    const systemUsers = [
      {
        email: 'admin@lms.com',
        password: hashedPassword,
        name: 'System Administrator',
        isActive: true,
        isEmailVerified: true,
        userType: 'ADMIN',
      },
      {
        email: 'superadmin@lms.com',
        password: hashedPassword,
        name: DefaultRoles.SUPER_ADMIN,
        isActive: true,
        isEmailVerified: true,
        userType: 'ADMIN',
      },
    ];

    // Create ADMIN users (100 admin users)
    const adminUsers = Array.from({ length: 10 }, (_, index) => ({
      email: `admin${index + 1}@lms.com`,
      password: hashedPassword,
      name: faker.person.fullName(),
      isActive: faker.datatype.boolean({ probability: 0.9 }),
      isEmailVerified: true,
      userType: 'ADMIN',
    }));

    // Create center owners (50 owners for 50 centers)
    const centerOwners = Array.from({ length: 10 }, (_, index) => ({
      email: `owner${index + 1}@center${index + 1}.com`,
      password: hashedPassword,
      name: faker.person.fullName(),
      isActive: true,
      isEmailVerified: true,
      userType: 'CENTER',
      centerIndex: index, // Each owner gets their own center
    }));

    // Create CENTER users (500 center users distributed across centers)
    const centerUsers = Array.from({ length: 100 }, (_, index) => ({
      email: `centeruser${index + 1}@lms.com`,
      password: hashedPassword,
      name: faker.person.fullName(),
      isActive: faker.datatype.boolean({ probability: 0.85 }),
      isEmailVerified: true,
      userType: 'CENTER',
      // Assign to a random center (will be handled in role assignment)
      centerIndex: Math.floor(Math.random() * 50), // 50 centers
    }));

    // Create some deactivated users for testing (50 users)
    const deactivatedUsers = Array.from({ length: 10 }, (_, index) => ({
      email: `deactivated${index + 1}@lms.com`,
      password: hashedPassword,
      name: faker.person.fullName(),
      isActive: false,
      isEmailVerified: true,
      userType: 'CENTER',
      centerIndex: Math.floor(Math.random() * 50),
    }));

    // Combine all users
    const userData = [
      ...systemUsers,
      ...adminUsers,
      ...centerOwners,
      ...centerUsers,
      ...deactivatedUsers,
    ];

    // Create users and profiles one by one to handle the circular dependency
    const savedUsers: User[] = [];

    for (const userDataItem of userData) {
      // Determine profile type based on user type
      let profileType = ProfileType.BASE_USER;
      let phone: string | undefined;
      let address: string | undefined;
      let dateOfBirth: Date | undefined;

      // Set profile type and additional data based on user type
      if (userDataItem.userType === 'ADMIN') {
        profileType = ProfileType.ADMIN;
        phone = '+1-555-0100';
        address = 'System Headquarters, Admin Building';
        // Set a reasonable birth date for admins (25-55 years old)
        const age = 25 + Math.floor(Math.random() * 30);
        dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      } else if (userDataItem.userType === 'CENTER') {
        profileType = ProfileType.BASE_USER; // Center users are base users
        phone = '+1-555-0200';
        address = 'Center Office';
        // Set a reasonable birth date for center users (22-50 years old)
        const age = 22 + Math.floor(Math.random() * 28);
        dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      } else {
        // Default for regular users
        profileType = ProfileType.BASE_USER;
        phone = '+1-555-0600';
        address = 'User Residence';
        // Set a reasonable birth date for regular users (18-50 years old)
        const age = 18 + Math.floor(Math.random() * 32);
        dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      }

      // Use raw SQL to handle the circular dependency by temporarily disabling constraints
      const savedUser = await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Generate UUIDs for both user and profile
          const userResult = await transactionalEntityManager.query(
            'SELECT gen_random_uuid() as id',
          );
          const profileResult = await transactionalEntityManager.query(
            'SELECT gen_random_uuid() as id',
          );

          const userUuid = userResult[0].id;
          const profileUuid = profileResult[0].id;

          // Temporarily disable foreign key constraints
          await transactionalEntityManager.query(
            'SET session_replication_role = replica',
          );

          // Insert user first
          await transactionalEntityManager.query(
            `INSERT INTO users (id, email, password, name, "isActive", "createdBy", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [
              userUuid,
              userDataItem.email,
              userDataItem.password,
              userDataItem.name,
              userDataItem.isActive,
              createdBy,
            ],
          );

          // Insert profile with the correct user ID
          await transactionalEntityManager.query(
            `INSERT INTO profiles (id, "userId", type, address, "dateOfBirth", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [profileUuid, userUuid, profileType, address, dateOfBirth],
          );

          // Re-enable foreign key constraints
          await transactionalEntityManager.query(
            'SET session_replication_role = DEFAULT',
          );

          // Return the user object
          const user = await transactionalEntityManager.findOne(User, {
            where: { id: userUuid },
          });
          if (!user) {
            throw new SeederException(
              `Failed to create user with ID: ${userUuid}`,
            );
          }
          return user;
        },
      );

      savedUsers.push(savedUser);
    }

    this.logger.log(`Created ${savedUsers.length} users with profiles`);

    return savedUsers;
  }

  private async assignRolesAndPermissions(
    users: User[],
    centers: Center[],
    createdBy: string,
  ): Promise<void> {
    this.logger.log('Assigning roles and permissions...');

    // Get all roles
    const allRoles = await this.roleRepository.find();

    // Get global ADMIN roles
    const superAdminRole = allRoles.find(
      (r) => r.name === 'Super Administrator' && !r.centerId,
    );
    const countryManagerRole = allRoles.find(
      (r) => r.name === 'Country Manager' && !r.centerId,
    );
    const technicalSupportRole = allRoles.find(
      (r) => r.name === 'Technical Support' && !r.centerId,
    );
    const languageCentersManagerRole = allRoles.find(
      (r) => r.name === 'Language Centers Manager' && !r.centerId,
    );
    const academicCentersManagerRole = allRoles.find(
      (r) => r.name === 'Academic Centers Manager' && !r.centerId,
    );

    // Get center-specific roles for each center
    const centerRolesMap = new Map<string, any>();
    for (const center of centers) {
      const centerRoles = allRoles.filter((r) => r.centerId === center.id);
      centerRolesMap.set(center.id, {
        owner: centerRoles.find((r) => r.name === 'Owner'),
        manager: centerRoles.find((r) => r.name === 'Manager'),
        assistant: centerRoles.find((r) => r.name === 'Assistant'),
        accountant: centerRoles.find((r) => r.name === 'Accountant'),
        cleaner: centerRoles.find((r) => r.name === 'Cleaner'),
        receptionist: centerRoles.find((r) => r.name === 'Receptionist'),
        securityGuard: centerRoles.find((r) => r.name === 'Security Guard'),
      });
    }

    // Get users by type
    const superAdminUser = users.find((u) => u.email === 'superadmin@lms.com');
    const systemAdminUser = users.find((u) => u.email === 'admin@lms.com');
    const adminUsers = users.filter(
      (u) =>
        u.email?.includes('admin') &&
        u.email !== 'admin@lms.com' &&
        u.email !== 'superadmin@lms.com',
    );
    const centerOwners = users.filter((u) => u.email?.includes('owner'));
    const centerUsers = users.filter((u) => u.email?.includes('centeruser'));
    const deactivatedUsers = users.filter((u) =>
      u.email?.includes('deactivated'),
    );

    // Assign global ADMIN roles
    if (superAdminUser && superAdminRole) {
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: superAdminUser.id,
          roleId: superAdminRole.id,
          createdBy,
        }),
      );
      this.logger.log(
        `Assigned Super Administrator role to ${superAdminUser.email}`,
      );
    }

    if (systemAdminUser && countryManagerRole) {
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: systemAdminUser.id,
          roleId: countryManagerRole.id,
          createdBy,
        }),
      );
      this.logger.log(
        `Assigned Country Manager role to ${systemAdminUser.email}`,
      );
    }

    // Assign ADMIN roles to admin users
    const adminRoles = [
      technicalSupportRole,
      languageCentersManagerRole,
      academicCentersManagerRole,
    ].filter(Boolean);
    for (let i = 0; i < adminUsers.length; i++) {
      const adminUser = adminUsers[i];
      const role = adminRoles[i % adminRoles.length]; // Cycle through available admin roles

      if (role) {
        await this.userRoleRepository.save(
          this.userRoleRepository.create({
            userId: adminUser.id,
            roleId: role.id,
            createdBy,
          }),
        );
        this.logger.log(`Assigned ${role.name} role to ${adminUser.email}`);
      }
    }

    // Assign CENTER roles to center owners
    for (let i = 0; i < centerOwners.length && i < centers.length; i++) {
      const owner = centerOwners[i];
      const center = centers[i];
      const centerRoles = centerRolesMap.get(center.id);

      if (centerRoles?.owner) {
        await this.userRoleRepository.save(
          this.userRoleRepository.create({
            userId: owner.id,
            roleId: centerRoles.owner.id,
            centerId: center.id,
            createdBy,
          }),
        );
        this.logger.log(
          `Assigned Owner role to ${owner.email} for center ${center.name}`,
        );
      }
    }

    // Assign CENTER roles to center users
    const centerRoleTypes = [
      'manager',
      'assistant',
      'accountant',
      'cleaner',
      'receptionist',
      'securityGuard',
    ];

    for (let i = 0; i < centerUsers.length; i++) {
      const centerUser = centerUsers[i];
      const centerIndex = (centerUser as any).centerIndex || i % centers.length;
      const center = centers[centerIndex];
      const centerRoles = centerRolesMap.get(center.id);

      if (centerRoles) {
        // Cycle through different center role types
        const roleType = centerRoleTypes[i % centerRoleTypes.length];
        const role = centerRoles[roleType];

        if (role) {
          await this.userRoleRepository.save(
            this.userRoleRepository.create({
              userId: centerUser.id,
              roleId: role.id,
              centerId: center.id,
              createdBy,
            }),
          );
          this.logger.log(
            `Assigned ${role.name} role to ${centerUser.email} for center ${center.name}`,
          );
        }
      }
    }

    // Assign CENTER roles to deactivated users (for testing)
    for (let i = 0; i < deactivatedUsers.length; i++) {
      const deactivatedUser = deactivatedUsers[i];
      const centerIndex =
        (deactivatedUser as any).centerIndex || i % centers.length;
      const center = centers[centerIndex];
      const centerRoles = centerRolesMap.get(center.id);

      if (centerRoles) {
        // Assign cleaner role to deactivated users
        const role = centerRoles.cleaner;

        if (role) {
          await this.userRoleRepository.save(
            this.userRoleRepository.create({
              userId: deactivatedUser.id,
              roleId: role.id,
              centerId: center.id,
              createdBy,
            }),
          );
          this.logger.log(
            `Assigned ${role.name} role to ${deactivatedUser.email} for center ${center.name}`,
          );
        }
      }
    }

    this.logger.log('Roles and permissions assigned successfully');
  }

  private async createActivityLogs(
    users: User[],
    centers: Center[],
    createdBy: string,
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
      await this.activityLogService.log(ActivityType.CENTER_CREATED, {
        centerId: center.id,
        centerName: center.name,
        createdBy,
        seeder: true,
      });
    }

    // Log user creation activities
    for (const user of users) {
      await this.activityLogService.log(ActivityType.USER_CREATED, {
        targetUserId: user.id,
        userEmail: user.email,
        userName: user.name,
        createdBy,
        seeder: true,
      });
    }

    this.logger.log('Activity logs created successfully');
  }

  private async createRolePermissions(
    users: User[],
    centers: Center[],
    createdBy: string,
  ): Promise<void> {
    this.logger.log('Creating role permissions...');

    // Get all roles and permissions
    const roles = await this.roleRepository.find();
    const permissions = await this.permissionRepository.find();

    if (roles.length === 0 || permissions.length === 0) {
      this.logger.warn(
        'No roles or permissions found, skipping role permissions creation',
      );
      return;
    }

    const rolePermissions = [];

    // Get all user roles
    const userRoles = await this.userRoleRepository.find({
      relations: ['user', 'role'],
    });

    for (const userRole of userRoles) {
      const user = userRole.user;
      const role = userRole.role;

      // Determine scope based on role type
      let scope: PermissionScope;
      if (role.type === 'ADMIN') {
        scope = PermissionScope.ADMIN;
      } else if (role.type === 'CENTER') {
        scope = PermissionScope.CENTER;
      } else {
        scope = PermissionScope.BOTH;
      }

      // Assign permissions based on role type and scope
      const rolePermissionsToAssign = this.getPermissionsForRole(
        role,
        permissions,
        scope,
      );

      for (const permission of rolePermissionsToAssign) {
        // Check if this role permission already exists
        const existingRolePermission =
          await this.rolePermissionRepository.findOne({
            where: {
              userId: user.id,
              roleId: role.id,
              permissionId: permission.id,
            },
          });

        if (!existingRolePermission) {
          rolePermissions.push({
            userId: user.id,
            roleId: role.id,
            permissionId: permission.id,
            permissionScope: scope,
          });
        }
      }
    }

    // Create role permissions in batches
    if (rolePermissions.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < rolePermissions.length; i += batchSize) {
        const batch = rolePermissions.slice(i, i + batchSize);
        await this.rolePermissionRepository.save(batch);
      }
    }

    this.logger.log(`Created ${rolePermissions.length} role permissions`);
  }

  private async createBranches(
    centers: Center[],
    createdBy: string,
  ): Promise<Branch[]> {
    this.logger.log('Creating branches for centers...');

    const branches: Branch[] = [];

    for (const center of centers) {
      // Create 2-4 branches per center
      const branchCount = 2 + Math.floor(Math.random() * 3); // 2-4 branches

      for (let i = 0; i < branchCount; i++) {
        const branch = this.branchRepository.create({
          centerId: center.id,
          location: faker.location.city(),
          isActive: faker.datatype.boolean({ probability: 0.9 }), // 90% active
          address: faker.location.streetAddress(),
          phone: generateShortPhone(),
          email: faker.internet.email(),
          createdBy: createdBy,
        });

        const savedBranch = await this.branchRepository.save(branch);
        branches.push(savedBranch);

        this.logger.log(
          `Created branch "${savedBranch.location}" for center "${center.name}"`,
        );
      }
    }

    this.logger.log(
      `Created ${branches.length} branches across ${centers.length} centers`,
    );
    return branches;
  }

  private async createBranchAccess(
    users: User[],
    branches: Branch[],
    centers: Center[],
    createdBy: string,
  ): Promise<void> {
    this.logger.log('Creating branch access for users...');

    const branchAccesses: BranchAccess[] = [];

    // Get center users (exclude system users and admins)
    const centerUsers = users.filter(
      (u) =>
        u.email?.includes('centeruser') ||
        u.email?.includes('owner') ||
        u.email?.includes('deactivated'),
    );

    // Create a map of center to branches
    const centerBranchesMap = new Map<string, Branch[]>();
    for (const branch of branches) {
      if (!centerBranchesMap.has(branch.centerId)) {
        centerBranchesMap.set(branch.centerId, []);
      }
      centerBranchesMap.get(branch.centerId)!.push(branch);
    }

    // Create a map of center to users
    const centerUsersMap = new Map<string, User[]>();
    for (const user of centerUsers) {
      // Get user's center from their email or assign randomly
      let centerIndex = 0;
      if (user.email?.includes('owner')) {
        // Owner users get their own center
        const match = user.email.match(/owner(\d+)@center(\d+)\.com/);
        if (match) {
          centerIndex = parseInt(match[2]) - 1;
        }
      } else {
        // Other users get random centers
        centerIndex = Math.floor(Math.random() * centers.length);
      }

      const center = centers[centerIndex];
      if (center) {
        if (!centerUsersMap.has(center.id)) {
          centerUsersMap.set(center.id, []);
        }
        centerUsersMap.get(center.id)!.push(user);
      }
    }

    // Assign users to branches within their centers
    for (const [centerId, centerBranches] of centerBranchesMap) {
      const centerUsers = centerUsersMap.get(centerId) || [];

      for (const user of centerUsers) {
        // Each user gets access to 1-3 random branches in their center
        const branchCount = 1 + Math.floor(Math.random() * 3);
        const shuffledBranches = [...centerBranches].sort(
          () => 0.5 - Math.random(),
        );
        const userBranches = shuffledBranches.slice(0, branchCount);

        for (const branch of userBranches) {
          const branchAccess = this.branchAccessRepository.create({
            userId: user.id,
            branchId: branch.id,
            centerId: centerId,
            isActive:
              user.isActive && faker.datatype.boolean({ probability: 0.95 }), // 95% active if user is active
          });

          branchAccesses.push(branchAccess);
        }
      }
    }

    // Save all branch accesses
    if (branchAccesses.length > 0) {
      await this.branchAccessRepository.save(branchAccesses);
    }

    this.logger.log(`Created ${branchAccesses.length} branch access records`);
  }

  private getPermissionsForRole(
    role: Role,
    permissions: Permission[],
    scope: PermissionScope,
  ): Permission[] {
    // Filter permissions based on role type and scope
    return permissions.filter((permission) => {
      // Super Admin gets all permissions
      if (role.name === 'Super Administrator') {
        return true;
      }

      // Center Owner gets all center and both scope permissions
      if (role.name === 'Owner') {
        return (
          permission.scope === PermissionScope.CENTER ||
          permission.scope === PermissionScope.BOTH
        );
      }

      // Admin roles get admin and both scope permissions
      if (role.type === 'ADMIN') {
        return (
          permission.scope === PermissionScope.ADMIN ||
          permission.scope === PermissionScope.BOTH
        );
      }

      // Center roles get center and both scope permissions
      if (role.type === 'CENTER') {
        return (
          permission.scope === PermissionScope.CENTER ||
          permission.scope === PermissionScope.BOTH
        );
      }

      // System roles get both scope permissions
      if (role.type === 'SYSTEM') {
        return permission.scope === PermissionScope.BOTH;
      }

      return false;
    });
  }
}
