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
import { faker } from '@faker-js/faker';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { Role } from '@/modules/access-control/entities/roles/role.entity';
import { UserRole } from '@/modules/access-control/entities/roles/user-role.entity';

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
    @InjectRepository(UserAccess)
    private readonly userAccessRepository: Repository<UserAccess>,
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

    const hashedPassword = await bcrypt.hash('system123', 10);

    // Create system user using raw SQL to avoid circular dependencies
    const systemUser = await this.userRepository.manager.transaction(
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
          `INSERT INTO users (id, email, password, name, "isActive", "profileId", "createdBy", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            userUuid,
            'system@lms.com',
            hashedPassword,
            'System User',
            true,
            profileUuid,
            userUuid, // createdBy is self for system user
          ],
        );

        // Insert profile with the correct user ID
        await transactionalEntityManager.query(
          `INSERT INTO profiles (id, "userId", type, phone, address, "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [profileUuid, userUuid, ProfileType.ADMIN, '+1-555-0000', 'System'],
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
          throw new Error(`Failed to create system user with ID: ${userUuid}`);
        }
        return user;
      },
    );

    this.logger.log('System user created successfully');
    return systemUser;
  }

  private async clearData(): Promise<void> {
    this.logger.log('Clearing existing data...');

    // Use a transaction to handle circular foreign key constraints
    await this.userRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Temporarily disable foreign key constraints
        await transactionalEntityManager.query(
          'SET session_replication_role = replica',
        );

        // Clear all data using raw SQL to ensure all operations are within the transaction
        await transactionalEntityManager.query('DELETE FROM activity_logs');
        await transactionalEntityManager.query('DELETE FROM user_roles');
        await transactionalEntityManager.query('DELETE FROM user_access');
        await transactionalEntityManager.query('DELETE FROM user_access');
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
        name: permission.name,
        action: permission.action,
        description: permission.name,
        isAdmin: permission.isAdmin,
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
    const centerNames = centers.map((center) => center.name);

    // Get all role definitions (global + center-specific)
    const roleDefinitions = getAllRoleDefinitions(centerIds, centerNames);

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

    this.logger.log(`Created ${roleEntities.length} roles:`);
    this.logger.log(
      `- ${roleDefinitions.filter((r) => !r.centerId).length} global roles`,
    );
    this.logger.log(
      `- ${roleDefinitions.filter((r) => r.centerId).length} center-specific roles`,
    );
    this.logger.log(`- ${randomRoles.length} random roles for variety`);
  }

  private async createCenters(
    users: User[],
    createdBy: string,
  ): Promise<Center[]> {
    this.logger.log('Creating centers...');

    // Get center owner users (skip the first 2 which are global admins)
    const centerOwners = users.slice(2, 6); // 4 center owners

    const centers = [
      {
        name: 'Bright Future Academy',
        description: 'Premier educational institution in Cairo',
        createdBy: centerOwners[0].id,
        isActive: true,
        city: 'Cairo',
        country: 'Egypt',
        address: faker.location.streetAddress().substring(0, 255),
        phone: generateShortPhone(),
        email: faker.internet.email().substring(0, 255),
        website: faker.internet.url().substring(0, 255),
      },
      {
        name: 'Knowledge Hub Center',
        description: 'Innovative learning center in Alexandria',
        createdBy: centerOwners[1].id,
        isActive: true,
        city: 'Alexandria',
        country: 'Egypt',
        address: faker.location.streetAddress().substring(0, 255),
        phone: generateShortPhone(),
        email: faker.internet.email().substring(0, 255),
        website: faker.internet.url().substring(0, 255),
      },
      {
        name: 'Elite Education Institute',
        description: 'Excellence in education in Giza',
        createdBy: centerOwners[2].id,
        isActive: true,
        city: 'Giza',
        country: 'Egypt',
        address: faker.location.streetAddress().substring(0, 255),
        phone: generateShortPhone(),
        email: faker.internet.email().substring(0, 255),
        website: faker.internet.url().substring(0, 255),
      },
      {
        name: 'Community Learning Center',
        description: 'Community-focused education in Luxor',
        createdBy: centerOwners[3].id,
        isActive: true,
        city: 'Luxor',
        country: 'Egypt',
        address: faker.location.streetAddress().substring(0, 255),
        phone: generateShortPhone(),
        email: faker.internet.email().substring(0, 255),
        website: faker.internet.url().substring(0, 255),
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

  private async createUsers(createdBy: string): Promise<User[]> {
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
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'owner2@knowledgehub.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'owner3@elite.edu',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'owner4@community.edu',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },

      // Teachers
      {
        email: 'teacher1@brightfuture.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'teacher2@brightfuture.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'teacher3@knowledgehub.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'teacher4@knowledgehub.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'teacher5@elite.edu',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'teacher6@community.edu',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },

      // Students
      {
        email: 'student1@brightfuture.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'student2@brightfuture.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'student3@knowledgehub.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'student4@knowledgehub.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'student5@elite.edu',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'student6@community.edu',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },

      // Managers/Assistants
      {
        email: 'manager1@brightfuture.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'manager2@knowledgehub.com',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'assistant1@elite.edu',
        password: hashedPassword,
        name: faker.person.fullName(),
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'assistant2@community.edu',
        password: hashedPassword,
        name: faker.person.fullName(),
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

          // Insert user first with the correct profile ID
          await transactionalEntityManager.query(
            `INSERT INTO users (id, email, password, name, "isActive", "profileId", "createdBy", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [
              userUuid,
              userDataItem.email,
              userDataItem.password,
              userDataItem.name,
              userDataItem.isActive,
              profileUuid,
              createdBy,
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
    createdBy: string,
  ): Promise<void> {
    this.logger.log('Assigning roles and permissions...');

    // Get all roles
    const allRoles = await this.roleRepository.find();

    // Get global roles
    const superAdminRole = allRoles.find(
      (r) => r.name === 'Super Administrator' && !r.centerId,
    );
    const systemAdminRole = allRoles.find(
      (r) => r.name === 'System Administrator' && !r.centerId,
    );

    // Get center-specific roles for each center
    const centerRolesMap = new Map<string, any>();
    for (const center of centers) {
      const centerRoles = allRoles.filter((r) => r.centerId === center.id);
      centerRolesMap.set(center.id, {
        centerAdmin: centerRoles.find((r) =>
          r.name.includes('Center Administrator'),
        ),
        centerManager: centerRoles.find((r) =>
          r.name.includes('Center Manager'),
        ),
        teacher: centerRoles.find((r) => r.name.includes('Teacher')),
        student: centerRoles.find((r) => r.name.includes('Student')),
        parent: centerRoles.find((r) => r.name.includes('Parent')),
        staff: centerRoles.find((r) => r.name.includes('Staff')),
      });
    }

    // Get users
    const superAdminUser = users.find((u) => u.email === 'superadmin@lms.com');
    const adminUser = users.find((u) => u.email === 'admin@lms.com');

    // Assign global roles
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

    if (adminUser && systemAdminRole) {
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId: adminUser.id,
          roleId: systemAdminRole.id,
          createdBy,
        }),
      );
      this.logger.log(
        `Assigned System Administrator role to ${adminUser.email}`,
      );
    }

    // Note: Center access is now managed through roles (centerId in userRoles)
    // Global admins (SUPER_ADMIN, ADMIN) have access to all centers by default

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
      const centerRoles = centerRolesMap.get(center.id);

      if (centerRoles?.centerAdmin) {
        await this.userRoleRepository.save(
          this.userRoleRepository.create({
            userId: owner.id,
            roleId: centerRoles.centerAdmin.id,
            centerId: center.id,
            createdBy,
          }),
        );

        // Center access is automatically granted through role assignment

        this.logger.log(
          `Assigned Center Administrator role to ${owner.email} for center ${center.name}`,
        );
      }
    }

    // Assign teachers to centers
    for (let i = 0; i < teachers.length && i < centers.length; i++) {
      const teacher = teachers[i];
      const center = centers[i];
      const centerRoles = centerRolesMap.get(center.id);

      if (centerRoles?.teacher) {
        await this.userRoleRepository.save(
          this.userRoleRepository.create({
            userId: teacher.id,
            roleId: centerRoles.teacher.id,
            centerId: center.id,
            createdBy,
          }),
        );

        // Center access is automatically granted through role assignment

        this.logger.log(
          `Assigned Teacher role to ${teacher.email} for center ${center.name}`,
        );
      }
    }

    // Assign students to centers
    for (let i = 0; i < students.length && i < centers.length; i++) {
      const student = students[i];
      const center = centers[i];
      const centerRoles = centerRolesMap.get(center.id);

      if (centerRoles?.student) {
        await this.userRoleRepository.save(
          this.userRoleRepository.create({
            userId: student.id,
            roleId: centerRoles.student.id,
            centerId: center.id,
            createdBy,
          }),
        );

        // Center access is automatically granted through role assignment

        this.logger.log(
          `Assigned Student role to ${student.email} for center ${center.name}`,
        );
      }
    }

    // Assign managers to centers
    for (let i = 0; i < managers.length && i < centers.length; i++) {
      const manager = managers[i];
      const center = centers[i];
      const centerRoles = centerRolesMap.get(center.id);

      if (centerRoles?.centerManager) {
        await this.userRoleRepository.save(
          this.userRoleRepository.create({
            userId: manager.id,
            roleId: centerRoles.centerManager.id,
            centerId: center.id,
            createdBy,
          }),
        );

        // Center access is automatically granted through role assignment

        this.logger.log(
          `Assigned Center Manager role to ${manager.email} for center ${center.name}`,
        );
      }
    }

    // Special case: center-deactivated user (deactivated in first center only)
    const centerDeactivatedUser = users.find(
      (u) => u.email === 'center-deactivated@lms.com',
    );
    if (centerDeactivatedUser && centers.length > 1) {
      const center = centers[1]; // Second center (active)
      const centerRoles = centerRolesMap.get(center.id);

      if (centerRoles?.staff) {
        await this.userRoleRepository.save(
          this.userRoleRepository.create({
            userId: centerDeactivatedUser.id,
            roleId: centerRoles.staff.id,
            centerId: center.id,
            createdBy,
          }),
        );

        // Center access is automatically granted through role assignment

        this.logger.log(
          `Assigned Staff role to ${centerDeactivatedUser.email} for center ${center.name}`,
        );
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
      await this.activityLogService.logCenterActivity(
        ActivityType.CENTER_CREATED,
        'Center created during seeding',
        createdBy,
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
        createdBy,
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
