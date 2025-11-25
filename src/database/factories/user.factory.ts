import { faker } from '@faker-js/faker';
import { User } from '@/modules/user/entities/user.entity';
import { UserInfo } from '@/modules/user/entities/user-info.entity';
import { Locale } from '@/shared/common/enums/locale.enum';

export class UserFactory {
  private static phoneCounter = 2; // Start from 2 since 0 and 1 are used by system/superadmin

  static create(overrides: Partial<User> = {}): Partial<User> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    // Generate unique phone number using counter
    const phoneNumber = this.generateUniquePhone();

    return {
      name: `${firstName} ${lastName}`,
      phone: phoneNumber,
      password: 'password123', // Will be hashed in seeder
      isActive: faker.datatype.boolean({ probability: 0.8 }), // 80% active
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.2 }), // 20% have 2FA
      ...overrides,
      // userInfo will be created separately in seeder if needed
    };
  }

  static createMany(
    count: number,
    overrides: Partial<User> = {},
  ): Partial<User>[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  private static generateUniquePhone(): string {
    // Format: 01XXXXXXXX where X is a digit
    // Use counter to ensure uniqueness, padding with zeros
    const counter = this.phoneCounter++;
    const phoneSuffix = counter.toString().padStart(10, '0');
    return `01${phoneSuffix}`;
  }

  static createSystemUser(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: 'System User',
      phone: '01000000000',
      password: 'system123',
      isActive: true,
      twoFactorEnabled: false,
      ...overrides,
    });
  }

  static createSuperAdmin(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: 'Super Administrator',
      phone: '01000000001',
      password: 'admin123',
      isActive: true,
      twoFactorEnabled: true,
      ...overrides,
    });
  }

  static createAdmin(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: faker.person.fullName(),
      password: 'admin123',
      isActive: true,
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.5 }),
      ...overrides,
    });
  }

  static createCenterOwner(
    centerName: string,
    overrides: Partial<User> = {},
  ): Partial<User> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return this.create({
      name: `${firstName} ${lastName}`,
      password: 'owner123',
      isActive: true,
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.7 }),
      ...overrides,
    });
  }

  static createTeacher(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: faker.person.fullName(),
      password: 'teacher123',
      isActive: faker.datatype.boolean({ probability: 0.9 }),
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.3 }),
      ...overrides,
    });
  }

  static createStudent(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: faker.person.fullName(),
      password: 'student123',
      isActive: faker.datatype.boolean({ probability: 0.95 }),
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.1 }),
      ...overrides,
    });
  }

  static createParent(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: faker.person.fullName(),
      password: 'parent123',
      isActive: faker.datatype.boolean({ probability: 0.85 }),
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.2 }),
      ...overrides,
    });
  }

  static createCenterStaff(overrides: Partial<User> = {}): Partial<User> {
    return this.create({
      name: faker.person.fullName(),
      password: 'staff123',
      isActive: faker.datatype.boolean({ probability: 0.8 }),
      twoFactorEnabled: faker.datatype.boolean({ probability: 0.2 }),
      ...overrides,
    });
  }

  private static createUserInfo(): Partial<UserInfo> {
    return {
      address: faker.location.streetAddress(),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
      locale: faker.helpers.enumValue(Locale),
    };
  }
}
