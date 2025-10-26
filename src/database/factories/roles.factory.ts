import { faker } from '@faker-js/faker';
import { Role } from '@/modules/access-control/entities/role.entity';

export const createRandomCenterRole = (centerId: string): Partial<Role> => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    rolePermissions: [],
    centerId,
  };
};

export const createRandomAdminRole = (): Partial<Role> => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    rolePermissions: [],
  };
};
