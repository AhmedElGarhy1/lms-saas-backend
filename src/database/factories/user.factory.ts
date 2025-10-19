import { faker } from '@faker-js/faker';
import { User } from '@/modules/user/entities/user.entity';
import { Profile } from '@/modules/user/entities/profile.entity';
import { ProfileType } from '@/modules/user/entities/profile.entity';

export class UserFactory {
  static create(overrides: Partial<User> = {}): Partial<User> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });

    return {
      name: `${firstName} ${lastName}`,
      email,
      password: 'password123', // Will be hashed in seeder
      isActive: faker.datatype.boolean({ probability: 0.8 }), // 80% active
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.2 }), // 20% have 2FA
      failedLoginAttempts: faker.number.int({ min: 0, max: 3 }),
      lockoutUntil: faker.datatype.boolean({ probability: 0.05 })
        ? faker.date.future()
        : undefined,
      profile: this.createProfile() as Profile,
      ...overrides,
    };
  }

  static createMany(
    count: number,
    overrides: Partial<User> = {},
  ): Partial<User>[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createSystemUser(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: 'System User',
      email: 'system@lms.com',
      password: 'system123',
      isActive: true,
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
      ...overrides,
    });
  }

  static createSuperAdmin(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: 'Super Administrator',
      email: 'superadmin@lms.com',
      password: 'admin123',
      isActive: true,
      twoFactorEnabled: true,
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
      ...overrides,
    });
  }

  static createAdmin(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'admin123',
      isActive: true,
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.5 }),
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
      ...overrides,
    });
  }

  static createCenterOwner(
    centerName: string,
    overrides: Partial<User> = {},
  ): Partial<User> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });

    return this.create({
      name: `${firstName} ${lastName}`,
      email,
      password: 'owner123',
      isActive: true,
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.7 }),
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
      ...overrides,
    });
  }

  static createTeacher(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'teacher123',
      isActive: faker.datatype.boolean({ probability: 0.9 }),
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.3 }),
      failedLoginAttempts: faker.number.int({ min: 0, max: 2 }),
      lockoutUntil: undefined,
      ...overrides,
    });
  }

  static createStudent(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'student123',
      isActive: faker.datatype.boolean({ probability: 0.95 }),
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.1 }),
      failedLoginAttempts: faker.number.int({ min: 0, max: 1 }),
      lockoutUntil: undefined,
      ...overrides,
    });
  }

  static createParent(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'parent123',
      isActive: faker.datatype.boolean({ probability: 0.85 }),
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.2 }),
      failedLoginAttempts: faker.number.int({ min: 0, max: 1 }),
      lockoutUntil: undefined,
      ...overrides,
    });
  }

  static createCenterStaff(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'staff123',
      isActive: faker.datatype.boolean({ probability: 0.8 }),
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.2 }),
      failedLoginAttempts: faker.number.int({ min: 0, max: 2 }),
      lockoutUntil: undefined,
      ...overrides,
    });
  }

  private static createProfile(): Partial<Profile> {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      type: faker.helpers.arrayElement(Object.values(ProfileType)),
      address: faker.location.streetAddress(),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
    };
  }
}
