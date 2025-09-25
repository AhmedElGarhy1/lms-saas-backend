import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Profile, ProfileType } from '@/modules/user/entities/profile.entity';
import { Center, CenterStatus } from '@/modules/centers/entities/center.entity';
import { Role } from '@/modules/access-control/entities/roles/role.entity';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { UserRole } from '@/modules/access-control/entities/roles/user-role.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { UserOnCenter } from '@/modules/access-control/entities/user-on-center.entity';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { ALL_PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userTypeOrmRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(UserAccess)
    private readonly userAccessRepository: Repository<UserAccess>,
    @InjectRepository(UserOnCenter)
    private readonly userOnCenterRepository: Repository<UserOnCenter>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly activityLogService: ActivityLogService,
    private readonly centersService: CentersService,
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

      // Create users with profiles (needed for center owners)
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

    // Use a transaction to handle circular foreign key constraints
    await this.userTypeOrmRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Temporarily disable foreign key constraints
        await transactionalEntityManager.query(
          'SET session_replication_role = replica',
        );

        // Clear all data using raw SQL to ensure all operations are within the transaction
        await transactionalEntityManager.query('DELETE FROM activity_logs');
        await transactionalEntityManager.query('DELETE FROM user_roles');
        await transactionalEntityManager.query('DELETE FROM user_access');
        await transactionalEntityManager.query('DELETE FROM user_on_centers');
        await transactionalEntityManager.query('DELETE FROM permissions');
        await transactionalEntityManager.query('DELETE FROM roles');
        await transactionalEntityManager.query('DELETE FROM refresh_tokens');
        await transactionalEntityManager.query(
          'DELETE FROM email_verifications',
        );
        await transactionalEntityManager.query(
          'DELETE FROM password_reset_tokens',
        );
        await transactionalEntityManager.query('DELETE FROM centers');
        await transactionalEntityManager.query('DELETE FROM users');
        await transactionalEntityManager.query('DELETE FROM profiles');

        // Re-enable foreign key constraints
        await transactionalEntityManager.query(
          'SET session_replication_role = DEFAULT',
        );
      },
    );

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
        type: RoleType.SUPER_ADMIN,
        description: 'System owner with no constraints - sees everything',
        permissions: [],
      },
      {
        name: 'Global Administrator',
        type: RoleType.ADMIN,
        description: 'System administrator with full constraints',
        permissions: [],
      },
      {
        name: 'Global User',
        type: RoleType.USER,
        description: 'Regular user with full constraints',
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
        createdBy: centerOwners[0].id,
        status: CenterStatus.ACTIVE,
        city: 'Cairo',
        country: 'Egypt',
      },
      {
        name: 'Knowledge Hub Center',
        description: 'Innovative learning center in Alexandria',
        createdBy: centerOwners[1].id,
        status: CenterStatus.ACTIVE,
        city: 'Alexandria',
        country: 'Egypt',
      },
      {
        name: 'Elite Education Institute',
        description: 'Excellence in education in Giza',
        createdBy: centerOwners[2].id,
        status: CenterStatus.ACTIVE,
        city: 'Giza',
        country: 'Egypt',
      },
      {
        name: 'Community Learning Center',
        description: 'Community-focused education in Luxor',
        createdBy: centerOwners[3].id,
        status: CenterStatus.ACTIVE,
        city: 'Luxor',
        country: 'Egypt',
      },
    ];

    const savedCenters = await Promise.all(
      centers.map((center) =>
        this.centersService.createCenterForSeeder(center),
      ),
    );
    this.logger.log(`Created ${savedCenters.length} centers`);

    return savedCenters;
  }

  private async createUsers(): Promise<User[]> {
    this.logger.log('Creating users and profiles...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const userData = [
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

    // Create users and profiles one by one to handle the circular dependency
    const savedUsers: User[] = [];

    for (const userDataItem of userData) {
      // Determine profile type based on user email/role
      let profileType = ProfileType.BASE_USER;
      let phone: string | undefined;
      let address: string | undefined;
      let dateOfBirth: Date | undefined;

      // Set profile type and additional data based on user type
      if (
        userDataItem.email.includes('admin@lms.com') ||
        userDataItem.email.includes('superadmin@lms.com')
      ) {
        profileType = ProfileType.ADMIN;
        phone = '+1-555-0100';
        address = 'System Headquarters, Admin Building';
      } else if (userDataItem.email.includes('owner')) {
        profileType = ProfileType.ADMIN; // Center owners are admins
        phone = '+1-555-0200';
        address = 'Center Management Office';
      } else if (userDataItem.email.includes('teacher')) {
        profileType = ProfileType.TEACHER;
        phone = '+1-555-0300';
        address = 'Faculty Building, Room 101';
        // Set a reasonable birth date for teachers (25-65 years old)
        const age = 25 + Math.floor(Math.random() * 40);
        dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      } else if (userDataItem.email.includes('student')) {
        profileType = ProfileType.STUDENT;
        phone = '+1-555-0400';
        address = 'Student Dormitory, Room 201';
        // Set a reasonable birth date for students (16-25 years old)
        const age = 16 + Math.floor(Math.random() * 9);
        dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      } else if (userDataItem.email.includes('guardian')) {
        profileType = ProfileType.GUARDIAN;
        phone = '+1-555-0500';
        address = 'Family Residence';
        // Set a reasonable birth date for guardians (30-60 years old)
        const age = 30 + Math.floor(Math.random() * 30);
        dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      } else {
        // Default for regular users
        phone = '+1-555-0600';
        address = 'User Residence';
        // Set a reasonable birth date for regular users (18-50 years old)
        const age = 18 + Math.floor(Math.random() * 32);
        dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
      }

      // Use raw SQL to handle the circular dependency by temporarily disabling constraints
      const savedUser = await this.userTypeOrmRepository.manager.transaction(
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

          // Insert user first with the correct profile ID
          await transactionalEntityManager.query(
            `INSERT INTO users (id, email, password, name, "isActive", "profileId", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [
              userUuid,
              userDataItem.email,
              userDataItem.password,
              userDataItem.name,
              userDataItem.isActive,
              profileUuid,
            ],
          );

          // Insert profile with the correct user ID
          await transactionalEntityManager.query(
            `INSERT INTO profiles (id, "userId", type, phone, address, "dateOfBirth", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [profileUuid, userUuid, profileType, phone, address, dateOfBirth],
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
            throw new Error(`Failed to create user with ID: ${userUuid}`);
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
  ): Promise<void> {
    this.logger.log('Assigning roles and permissions...');

    // Get roles
    const superAdminRole = await this.roleRepository.findOne({
      where: { type: RoleType.SUPER_ADMIN },
    });
    const adminRole = await this.roleRepository.findOne({
      where: { type: RoleType.ADMIN },
    });
    const userRole = await this.roleRepository.findOne({
      where: { type: RoleType.USER },
    });

    // Get center-specific roles
    const centerRoles = await this.roleRepository.find({
      where: { type: RoleType.CENTER_ADMIN },
    });

    // Get users
    const superAdminUser = users.find((u) => u.email === 'superadmin@lms.com');
    const adminUser = users.find((u) => u.email === 'admin@lms.com');
    const regularUser = users.find((u) => u.email === 'regular@lms.com');

    if (adminUser && adminRole) {
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: adminUser.id,
          roleId: adminRole.id,
        }),
      );

      // Grant admin access to all centers
      for (const center of centers) {
        await this.userOnCenterRepository.save(
          this.userOnCenterRepository.create({
            userId: adminUser.id,
            centerId: center.id,
          }),
        );
      }
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

      // Add regular user to the first center
      if (centers.length > 0) {
        await this.userOnCenterRepository.save(
          this.userOnCenterRepository.create({
            userId: regularUser.id,
            centerId: centers[0].id,
          }),
        );

        // Grant user access to center
        await this.userAccessRepository.save(
          this.userAccessRepository.create({
            targetUserId: regularUser.id,
            granterUserId: superAdminUser?.id || adminUser?.id,
            centerId: centers[0].id, // Add centerId for the first center
          }),
        );
      }
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
      // Use adminRole instead of centerRoles[i] since CENTER_ADMIN roles don't exist
      const centerRole = adminRole;

      if (centerRole) {
        // Add null check
        await this.userRoleRepository.save(
          this.userRoleRepository.create({
            userId: owner.id,
            roleId: centerRole.id,
          }),
        );
      }

      // Grant admin center access
      await this.userOnCenterRepository.save(
        this.userOnCenterRepository.create({
          userId: owner.id,
          centerId: center.id,
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
          roleId: userRole?.id,
        }),
      );

      // Grant user access to center
      await this.userAccessRepository.save(
        this.userAccessRepository.create({
          targetUserId: teacher.id,
          granterUserId: centerOwners[i]?.id || superAdminUser?.id,
          centerId: center.id, // Add centerId for the current center
        }),
      );

      // Add user to center
      await this.userOnCenterRepository.save(
        this.userOnCenterRepository.create({
          userId: teacher.id,
          centerId: center.id,
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
          roleId: userRole?.id,
        }),
      );

      // Grant user access to center
      await this.userAccessRepository.save(
        this.userAccessRepository.create({
          targetUserId: student.id,
          granterUserId: centerOwners[i]?.id || superAdminUser?.id,
          centerId: center.id, // Add centerId for the current center
        }),
      );

      // Add user to center
      await this.userOnCenterRepository.save(
        this.userOnCenterRepository.create({
          userId: student.id,
          centerId: center.id,
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
          roleId: userRole?.id,
        }),
      );

      // Grant user access to center
      await this.userAccessRepository.save(
        this.userAccessRepository.create({
          targetUserId: manager.id,
          granterUserId: centerOwners[i]?.id || superAdminUser?.id,
          centerId: center.id, // Add centerId for the current center
        }),
      );

      // Add user to center
      await this.userOnCenterRepository.save(
        this.userOnCenterRepository.create({
          userId: manager.id,
          centerId: center.id,
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
            roleId: userRole?.id,
          }),
        );

        await this.userAccessRepository.save(
          this.userAccessRepository.create({
            targetUserId: centerDeactivatedUser.id,
            granterUserId: superAdminUser?.id,
            centerId: centers[1].id, // Add centerId for the second center
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
