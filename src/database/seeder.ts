import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { ALL_PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import * as bcrypt from 'bcrypt';
import { Role } from '@/modules/access-control/entities/role.entity';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { DefaultRoles } from '@/modules/access-control/constants/roles';
import { SeederException } from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class DatabaseSeeder {
  private readonly logger: Logger = new Logger(DatabaseSeeder.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly activityLogService: ActivityLogService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async seed(): Promise<void> {
    try {
      // Reset database completely for clean seeding
      await this.resetDatabase();

      // Create system user first (needed for createdBy field)
      const systemUser = await this.createSystemUser();

      // Create permissions
      await this.createPermissions();

      // Create superadmin user
      const superAdminUser = await this.createSuperAdminUser(systemUser.id);

      // Create user profiles and staff records for both system user and superadmin
      await this.createUserProfilesAndStaff([systemUser, superAdminUser]);

      // Create global roles
      await this.createGlobalRoles(systemUser.id);

      // Assign roles and permissions to both system user and superadmin
      await this.assignRolesAndPermissions(
        [systemUser, superAdminUser],
        systemUser.id,
      );

      // Create activity logs
      await this.createActivityLogs(
        [systemUser, superAdminUser],
        systemUser.id,
      );
    } catch (error) {
      this.logger.error('Error during seeding', error);
      throw error;
    }
  }

  private async createSystemUser(): Promise<User> {
    this.logger.log('Creating system user...');

    // Check if system user already exists
    let systemUser = await this.dataSource.getRepository(User).findOne({
      where: { phone: '01000000000' },
    });

    if (systemUser) {
      return systemUser;
    }

    // Note: Using raw SQL, so entity hooks won't trigger - hash manually
    const hashedPassword = await bcrypt.hash('system123', 12);

    // Create system user using raw SQL to avoid circular dependencies
    systemUser = await this.dataSource.transaction(
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
          `INSERT INTO users (id, password, name, "isActive", "createdBy", "phone", "phoneVerified", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())`,
          [
            userUuid,
            hashedPassword,
            'System User',
            true,
            userUuid, // createdBy is self for system user
            '01000000000',
          ],
        );

        // Insert user info with the correct user ID
        await transactionalEntityManager.query(
          `INSERT INTO user_info (id, "userId", address, locale, "createdAt", "updatedAt", "createdBy", "updatedBy") 
           VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6)`,
          [profileUuid, userUuid, 'System', 'en', userUuid, userUuid],
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
          throw new SeederException('t.messages.seederFailed');
        }
        return user;
      },
    );

    return systemUser;
  }

  private async createSuperAdminUser(createdBy: string): Promise<User> {
    this.logger.log('Creating superadmin user...');

    // Note: Using raw SQL, so entity hooks won't trigger - hash manually
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create superadmin user using raw SQL
    const superAdminUser = await this.dataSource.transaction(
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
          `INSERT INTO users (id, password, name, "isActive", "createdBy", "phone", "phoneVerified", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())`,
          [
            userUuid,
            hashedPassword,
            'Super Administrator',
            true,
            createdBy,
            '01000000001',
          ],
        );

        // Insert user info with the correct user ID
        await transactionalEntityManager.query(
          `INSERT INTO user_info (id, "userId", address, locale, "createdAt", "updatedAt", "createdBy", "updatedBy") 
           VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6)`,
          [
            profileUuid,
            userUuid,
            'Super Administrator Headquarters',
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
          throw new SeederException('t.messages.seederFailed');
        }
        return user;
      },
    );

    return superAdminUser;
  }

  private async resetDatabase(): Promise<void> {
    this.logger.log('Resetting database...');

    try {
      // Drop all tables and recreate them
      await this.dataSource.dropDatabase();
      await this.dataSource.synchronize();

      this.logger.log('Database reset successfully');
    } catch (error) {
      this.logger.error('Error resetting database', error);
      throw error;
    }
  }

  private async createPermissions(): Promise<void> {
    this.logger.log('Creating permissions...');

    const permissionEntities = ALL_PERMISSIONS.map((permission) => ({
      name: permission.name,
      action: permission.action,
      description: permission.name,
      group: permission.group,
      scope: permission.scope,
    }));

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(Permission)
      .values(permissionEntities)
      .execute();

    this.logger.log(`Created ${permissionEntities.length} permissions`);
  }

  private async createGlobalRoles(createdBy: string): Promise<void> {
    this.logger.log('Creating global roles...');

    // Create only essential global roles
    const globalRoles = [
      {
        name: 't.roles.superAdmin.name',
        description: 't.roles.superAdmin.description',
        type: 'ADMIN',
        createdBy,
        readOnly: true,
      },
    ];

    const roleEntities = globalRoles.map((role) => ({
      name: role.name,
      description: role.description,
      createdBy: role.createdBy,
      readOnly: role.readOnly,
    }));

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(Role)
      .values(roleEntities)
      .execute();

    this.logger.log(`Created ${roleEntities.length} global roles`);
  }

  private async createUserProfilesAndStaff(users: User[]): Promise<void> {
    this.logger.log('Creating user profiles and staff records...');

    for (const user of users) {
      // Create both admin and user profile in a single transaction
      await this.dataSource.transaction(async (transactionalEntityManager) => {
        // Generate UUIDs for both admin and profile
        const adminResult = await transactionalEntityManager.query(
          'SELECT gen_random_uuid() as id',
        );
        const profileResult = await transactionalEntityManager.query(
          'SELECT gen_random_uuid() as id',
        );

        const adminUuid = adminResult[0].id;
        const profileUuid = profileResult[0].id;

        // Temporarily disable foreign key constraints
        await transactionalEntityManager.query(
          'SET session_replication_role = replica',
        );

        // Insert admin record first
        await transactionalEntityManager.query(
          `INSERT INTO admins (id, "createdBy", "createdAt", "updatedAt") 
             VALUES ($1, $2, NOW(), NOW())`,
          [adminUuid, user.createdBy],
        );

        // Insert user profile linking user to admin
        await transactionalEntityManager.query(
          `INSERT INTO user_profiles (id, "userId", "profileType", "profileRefId", "createdBy", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [profileUuid, user.id, ProfileType.ADMIN, adminUuid, user.createdBy],
        );

        // Re-enable foreign key constraints
        await transactionalEntityManager.query(
          'SET session_replication_role = DEFAULT',
        );
      });

      // Routine operation - no log needed
    }

    this.logger.log(`Created ${users.length} staff profiles`);
  }

  private async assignRolesAndPermissions(
    users: User[],
    createdBy: string,
  ): Promise<void> {
    this.logger.log('Assigning roles and permissions...');

    // Get all roles
    const allRoles = await this.dataSource.getRepository(Role).find();

    // Get Super Administrator role
    const superAdminRole = allRoles.find(
      (r) => r.name === (DefaultRoles.SUPER_ADMIN as string) && !r.centerId,
    );

    // Get users by type
    const systemUser = users.find((u) => u.phone === '01000000000');
    const superAdminUser = users.find((u) => u.phone === '01000000001');

    // Assign Super Administrator role to system user
    if (systemUser && superAdminRole) {
      const systemUserProfile = await this.dataSource
        .getRepository(UserProfile)
        .findOne({
          where: { userId: systemUser.id, profileType: ProfileType.ADMIN },
        });

      await this.dataSource.getRepository(ProfileRole).save({
        userProfileId: systemUserProfile?.id || '',
        roleId: superAdminRole.id,
        createdBy,
      });
      this.logger.log(
        `Assigned Super Administrator role to ${systemUser.phone}`,
      );
    }

    // Assign Super Administrator role to superadmin user
    if (superAdminUser && superAdminRole) {
      const superAdminProfile = await this.dataSource
        .getRepository(UserProfile)
        .findOne({
          where: { userId: superAdminUser.id, profileType: ProfileType.ADMIN },
        });

      await this.dataSource.getRepository(ProfileRole).save({
        userProfileId: superAdminProfile?.id || '',
        roleId: superAdminRole.id,
        createdBy,
      });
      this.logger.log(
        `Assigned Super Administrator role to ${superAdminUser.phone}`,
      );
    }

    this.logger.log('Roles and permissions assigned successfully');
  }

  private async createActivityLogs(
    users: User[],
    createdBy: string,
  ): Promise<void> {
    this.logger.log('Creating activity logs...');

    const systemUser = users.find((u) => u.phone === '01000000000');
    const superAdmin = users.find((u) => u.phone === '01000000001');

    // Log system user creation activity
    if (systemUser) {
      const systemUserProfile = await this.dataSource
        .getRepository(UserProfile)
        .findOne({
          where: { userId: systemUser.id, profileType: ProfileType.ADMIN },
        });

      await this.activityLogService.log(
        UserActivityType.USER_CREATED,
        {
          targetProfileId: systemUserProfile?.id,
          userPhone: systemUser.phone,
          userName: systemUser.name,
          createdBy,
          seeder: true,
        },
        systemUser.id,
      );
    }

    // Log superadmin user creation activity
    if (superAdmin) {
      const superAdminProfile = await this.dataSource
        .getRepository(UserProfile)
        .findOne({
          where: { userId: superAdmin.id, profileType: ProfileType.ADMIN },
        });

      await this.activityLogService.log(
        UserActivityType.USER_CREATED,
        {
          targetProfileId: superAdminProfile?.id,
          userPhone: superAdmin.phone,
          userName: superAdmin.name,
          createdBy,
          seeder: true,
        },
        superAdmin.id,
      );
    }
  }
}
