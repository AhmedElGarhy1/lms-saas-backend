import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { UserInfo } from '@/modules/user/entities/user-info.entity';
import { UserProfile } from '@/modules/profile/entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { ALL_PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import * as bcrypt from 'bcrypt';
import { Role } from '@/modules/access-control/entities/role.entity';
import { UserRole } from '@/modules/access-control/entities/user-role.entity';
import { SeederException } from '@/shared/common/exceptions/custom.exceptions';
import { Admin } from '@/modules/profile/entities/admin.entity';

@Injectable()
export class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserInfo)
    private readonly userInfoRepository: Repository<UserInfo>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      // Reset database completely for clean seeding
      await this.resetDatabase();

      // Create system user first (needed for createdBy field)
      const systemUser = await this.createSystemUser();

      // Create permissions
      await this.createPermissions();

      // Create superadmin user
      const superAdminUser = await this.createSuperAdminUser(systemUser.id);

      // Create user profiles and staff records for superadmin
      await this.createUserProfilesAndStaff([superAdminUser]);

      // Create global roles
      await this.createGlobalRoles(systemUser.id);

      // Assign roles and permissions to superadmin
      await this.assignRolesAndPermissions([superAdminUser], systemUser.id);

      // Create activity logs
      await this.createActivityLogs([superAdminUser], systemUser.id);

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

        // Insert user info with the correct user ID
        await transactionalEntityManager.query(
          `INSERT INTO user_info (id, "userId", "fullName", address, locale, "createdAt", "updatedAt", "createdBy", "updatedBy") 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7)`,
          [
            profileUuid,
            userUuid,
            'System User',
            'System',
            'en',
            userUuid,
            userUuid,
          ],
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

  private async createSuperAdminUser(createdBy: string): Promise<User> {
    this.logger.log('Creating superadmin user...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create superadmin user using raw SQL
    const superAdminUser = await this.userRepository.manager.transaction(
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
            'superadmin@lms.com',
            hashedPassword,
            'Super Administrator',
            true,
            createdBy,
          ],
        );

        // Insert user info with the correct user ID
        await transactionalEntityManager.query(
          `INSERT INTO user_info (id, "userId", "fullName", address, locale, "createdAt", "updatedAt", "createdBy", "updatedBy") 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7)`,
          [
            profileUuid,
            userUuid,
            'Super Administrator',
            'System Headquarters',
            'en',
            createdBy,
            createdBy,
          ],
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
            `Failed to create superadmin user with ID: ${userUuid}`,
          );
        }
        return user;
      },
    );

    this.logger.log('Superadmin user created successfully');
    return superAdminUser;
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

  private async createGlobalRoles(createdBy: string): Promise<void> {
    this.logger.log('Creating global roles...');

    // Create only essential global roles
    const globalRoles = [
      {
        name: 'Super Administrator',
        description: 'Full system access with all permissions',
        type: 'ADMIN',
        createdBy,
      },
    ];

    const roleEntities = globalRoles.map((role) =>
      this.roleRepository.create({
        name: role.name,
        description: role.description,
        type: role.type as any,
        createdBy: role.createdBy,
      }),
    );
    await this.roleRepository.save(roleEntities);

    this.logger.log(`Created ${roleEntities.length} global roles`);
  }

  private async createUserProfilesAndStaff(users: User[]): Promise<void> {
    this.logger.log('Creating user profiles and staff records...');

    for (const user of users) {
      // Create staff record using raw SQL to avoid RequestContext issues
      const admin = await this.adminRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Generate UUID for staff
          const adminResult = await transactionalEntityManager.query(
            'SELECT gen_random_uuid() as id',
          );
          const adminUuid = adminResult[0].id;

          // Temporarily disable foreign key constraints
          await transactionalEntityManager.query(
            'SET session_replication_role = replica',
          );

          // Insert staff record
          await transactionalEntityManager.query(
            `INSERT INTO admins (id, "createdBy", "createdAt", "updatedAt") 
             VALUES ($1, $2, NOW(), NOW())`,
            [adminUuid, user.createdBy],
          );

          // Re-enable foreign key constraints
          await transactionalEntityManager.query(
            'SET session_replication_role = DEFAULT',
          );

          // Return the staff object
          const admin = await transactionalEntityManager.findOne(Admin, {
            where: { id: adminUuid },
          });
          if (!admin) {
            throw new SeederException(
              `Failed to create admin with ID: ${adminUuid}`,
            );
          }
          return admin;
        },
      );

      // Create user profile linking user to staff using raw SQL
      await this.userProfileRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Generate UUID for user profile
          const profileResult = await transactionalEntityManager.query(
            'SELECT gen_random_uuid() as id',
          );
          const profileUuid = profileResult[0].id;

          // Temporarily disable foreign key constraints
          await transactionalEntityManager.query(
            'SET session_replication_role = replica',
          );

          // Insert user profile
          await transactionalEntityManager.query(
            `INSERT INTO user_profiles (id, "userId", "profileType", "profileRefId", "createdBy", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [profileUuid, user.id, ProfileType.ADMIN, admin.id, user.createdBy],
          );

          // Re-enable foreign key constraints
          await transactionalEntityManager.query(
            'SET session_replication_role = DEFAULT',
          );
        },
      );

      this.logger.log(`Created staff profile for user: ${user.email}`);
    }

    this.logger.log(`Created ${users.length} staff profiles`);
  }

  private async assignRolesAndPermissions(
    users: User[],
    createdBy: string,
  ): Promise<void> {
    this.logger.log('Assigning roles and permissions...');

    // Get all roles
    const allRoles = await this.roleRepository.find();

    // Get Super Administrator role
    const superAdminRole = allRoles.find(
      (r) => r.name === 'Super Administrator' && !r.centerId,
    );

    // Get users by type
    const superAdminUser = users.find((u) => u.email === 'superadmin@lms.com');
    // Assign Super Administrator role to superadmin user
    if (superAdminUser && superAdminRole) {
      const superAdminProfile = await this.userProfileRepository.findOne({
        where: { userId: superAdminUser.id, profileType: ProfileType.ADMIN },
      });
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: superAdminUser.id,
          roleId: superAdminRole.id,
          profileId: superAdminProfile?.id,
          createdBy,
        }),
      );
      this.logger.log(
        `Assigned Super Administrator role to ${superAdminUser.email}`,
      );
    }

    this.logger.log('Roles and permissions assigned successfully');
  }

  private async createActivityLogs(
    users: User[],
    createdBy: string,
  ): Promise<void> {
    this.logger.log('Creating activity logs...');

    const superAdmin = users.find((u) => u.email === 'superadmin@lms.com');

    if (!superAdmin) {
      this.logger.warn('Super admin not found, skipping activity logs');
      return;
    }

    // Log user creation activity
    await this.activityLogService.log(ActivityType.USER_CREATED, {
      targetUserId: superAdmin.id,
      userEmail: superAdmin.email,
      userName: superAdmin.name,
      createdBy,
      seeder: true,
    });

    this.logger.log('Activity logs created successfully');
  }
}
