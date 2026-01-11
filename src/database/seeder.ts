import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { ALL_PERMISSIONS } from '@/modules/access-control/constants/permissions';
import * as bcrypt from 'bcrypt';
import { Role } from '@/modules/access-control/entities/role.entity';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { DefaultRoles } from '@/modules/access-control/constants/roles';
import { SystemErrors } from '@/shared/common/exceptions/system.exception';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';
import { WalletService } from '@/modules/finance/services/wallet.service';
import { WalletOwnerType } from '@/modules/finance/enums/wallet-owner-type.enum';
import { RequestContext } from '@/shared/common/context/request.context';
import { Locale } from '@/shared/common/enums/locale.enum';

@Injectable()
export class DatabaseSeeder {
  private readonly logger: Logger = new Logger(DatabaseSeeder.name);

  constructor(
    private readonly dataSource: DataSource,
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

      // Create wallets for seeder accounts (since we use raw SQL, events aren't emitted)
      await this.createSeederWallets([systemUser, superAdminUser]);
    } catch (error) {
      this.logger.error('Error during seeding', error);
      throw error;
    }
  }

  private async createSystemUser(): Promise<User> {
    this.logger.log('Creating system user...');

    // Check if system user already exists by ID (fixed UUID)
    let systemUser = await this.dataSource.getRepository(User).findOne({
      where: { id: SYSTEM_USER_ID },
    });

    if (systemUser) {
      this.logger.log('System user already exists with fixed UUID');
      return systemUser;
    }

    // Also check by phone as fallback (for existing databases)
    systemUser = await this.dataSource.getRepository(User).findOne({
      where: { phone: '01000000000' },
    });

    if (systemUser) {
      this.logger.warn(
        `System user exists with different UUID (${systemUser.id}). Consider migrating to fixed UUID ${SYSTEM_USER_ID}`,
      );
      return systemUser;
    }

    // Note: Using raw SQL, so entity hooks won't trigger - hash manually
    const hashedPassword = await bcrypt.hash('system123', 12);

    // Create system user using raw SQL to avoid circular dependencies
    // Use fixed SYSTEM_USER_ID instead of generating random UUID
    systemUser = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // Use fixed UUID for system user
        const userUuid = SYSTEM_USER_ID;
        // Generate UUID for profile (profile can have random UUID)
        const profileResult = await transactionalEntityManager.query(
          'SELECT gen_random_uuid() as id',
        );
        const profileUuid = profileResult[0].id;

        // Temporarily disable foreign key constraints
        await transactionalEntityManager.query(
          'SET session_replication_role = replica',
        );

        // Insert user first
        await transactionalEntityManager.query(
          `INSERT INTO users (id, password, name, "isActive", "createdByProfileId", "phone", "phoneVerified", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())`,
          [
            userUuid,
            hashedPassword,
            'System User',
            true,
            userUuid, // createdByProfileId is self for system user
            '01000000000',
          ],
        );

        // Insert user info with the correct user ID
        await transactionalEntityManager.query(
          `INSERT INTO user_info (id, "userId", address, locale, "createdAt", "updatedAt", "createdByProfileId", "updatedByProfileId")
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
          throw SystemErrors.internalServerError({
            operation: 'seeder_create_user',
            userId: userUuid,
          });
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
          `INSERT INTO users (id, password, name, "isActive", "createdByProfileId", "phone", "phoneVerified", "createdAt", "updatedAt")
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
          `INSERT INTO user_info (id, "userId", address, locale, "createdAt", "updatedAt", "createdByProfileId", "updatedByProfileId")
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
          throw SystemErrors.internalServerError({
            operation: 'seeder_create_user',
            userId: userUuid,
          });
        }
        return user;
      },
    );

    return superAdminUser;
  }

  private async resetDatabase(): Promise<void> {
    this.logger.log('Resetting database...');

    try {
      // Since synchronize is enabled globally, we can use it to reset
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
      action: permission.action,
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
        name: 'Super Administrator',
        description: 'Super Administrator role with full system access',
        type: 'ADMIN',
        createdBy,
        readOnly: true,
      },
    ];

    const now = new Date();
    const roleEntities = globalRoles.map((role) => ({
      id: undefined, // Let DB generate
      name: role.name,
      description: role.description,
      centerId: undefined, // Global roles don't belong to a center
      readOnly: role.readOnly,
      // BaseEntity fields
      createdAt: now,
      updatedAt: now,
      createdByProfileId: role.createdBy,
      updatedByProfileId: undefined,
      deletedAt: undefined,
      deletedByProfileId: undefined,
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

    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      // Create both admin and user profile in a single transaction
      await this.dataSource.transaction(async (transactionalEntityManager) => {
        // Special handling for system user - use fixed UUIDs
        const isSystemUser = user.id === SYSTEM_USER_ID;

        let adminUuid: string;
        let profileUuid: string;

        if (isSystemUser) {
          // Use fixed UUIDs for system user
          adminUuid = SYSTEM_USER_ID;
          profileUuid = SYSTEM_USER_ID;
        } else {
          // Generate random UUIDs for regular users
          const adminResult = await transactionalEntityManager.query(
            'SELECT gen_random_uuid() as id',
          );
          const profileResult = await transactionalEntityManager.query(
            'SELECT gen_random_uuid() as id',
          );

          adminUuid = adminResult[0].id;
          profileUuid = profileResult[0].id;
        }

        // Temporarily disable foreign key constraints
        await transactionalEntityManager.query(
          'SET session_replication_role = replica',
        );

        // Skip admin record creation for system user (it doesn't need one)
        if (!isSystemUser) {
          // Insert admin record first
          await transactionalEntityManager.query(
            `INSERT INTO admins (id, "createdByProfileId", "createdAt", "updatedAt")
               VALUES ($1, $2, NOW(), NOW())`,
            [adminUuid, user.createdByProfileId],
          );
        }

        // Insert user profile linking user to admin (or self for system user)
        const profileCode = isSystemUser
          ? 'SYS001'
          : `ADMIN-25-00000${index + 1}`;
        const profileRefId = isSystemUser ? SYSTEM_USER_ID : adminUuid;

        await transactionalEntityManager.query(
          `INSERT INTO user_profiles (id, "userId", "profileType", "profileRefId", "createdByProfileId", "createdAt", "updatedAt", "code")
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)`,
          [
            profileUuid,
            user.id,
            ProfileType.ADMIN,
            profileRefId,
            user.createdByProfileId,
            profileCode,
          ],
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
        createdByProfileId: createdBy,
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
        createdByProfileId: createdBy,
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

      // Activity logging removed
    }

    // Log superadmin user creation activity
    if (superAdmin) {
      const superAdminProfile = await this.dataSource
        .getRepository(UserProfile)
        .findOne({
          where: { userId: superAdmin.id, profileType: ProfileType.ADMIN },
        });

      // Activity logging removed
    }
  }

  /**
   * Create wallets for seeder accounts
   * Since seeder uses raw SQL, events aren't emitted, so we need to create wallets manually
   * Uses ModuleRef to lazily get WalletService to avoid circular dependencies
   */
  private async createSeederWallets(users: User[]): Promise<void> {
    this.logger.log('Creating wallets for seeder accounts...');

    // Lazily get WalletService to avoid circular dependencies
    const walletService = this.moduleRef.get(WalletService, { strict: false });

    // Get system user ID for createdBy field
    const systemUser = users.find((u) => u.phone === '01000000000');
    const systemUserId = systemUser?.id || SYSTEM_USER_ID;

    // Set up RequestContext with system user ID so BaseEntity hooks can set createdBy
    // Note: userProfileId will be set when creating specific profiles
    await RequestContext.run(
      {
        userId: systemUserId,
        userProfileId: systemUserId, // For system operations, use same ID
        locale: Locale.EN,
      },
      async () => {
        for (const user of users) {
          try {
            // Find user profiles for this user
            const userProfiles = await this.dataSource
              .getRepository(UserProfile)
              .find({
                where: { userId: user.id },
              });

            // Create wallet for each user profile
            for (const profile of userProfiles) {
              await walletService.getWallet(
                profile.id,
                WalletOwnerType.USER_PROFILE,
              );
              this.logger.debug(
                `Wallet created for seeder profile: ${profile.id} (${profile.profileType})`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Failed to create wallet for seeder user ${user.id}`,
              error instanceof Error ? error.stack : String(error),
            );
            // Don't throw - wallet creation failure shouldn't break seeding
          }
        }
      },
    );

    this.logger.log('Wallets created for seeder accounts');
  }
}
