import { RoleType } from '@/shared/common/enums/role-type.enum';
import { faker } from '@faker-js/faker';
import { USER_PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Role } from '@/modules/access-control/entities/roles/role.entity';

export const createRandomCenterRole = (centerId: string): Partial<Role> => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    type: RoleType.CENTER,
    rolePermissions: [],
    centerId,
  };
};

export const createRandomAdminRole = (): Partial<Role> => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    type: RoleType.ADMIN,
    rolePermissions: [],
  };
};
