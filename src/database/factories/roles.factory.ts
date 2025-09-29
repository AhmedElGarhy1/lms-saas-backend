import { RoleType } from '@/shared/common/enums/role-type.enum';
import { faker } from '@faker-js/faker';
import { USER_PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { Role } from '@/modules/access-control/entities/roles/role.entity';

export const createRandomCenterRole = (centerId: string): Partial<Role> => {
  const permissions = faker.helpers
    .arrayElements(USER_PERMISSIONS)
    .map((permission) => permission.action);

  return {
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    type: faker.helpers.arrayElement([RoleType.CENTER_ADMIN, RoleType.USER]),
    permissions: permissions!,
    centerId,
  };
};

export const createRandomAdminRole = (): Partial<Role> => {
  const permissions = faker.helpers
    .arrayElements(USER_PERMISSIONS)
    .map((permission) => permission.action);

  return {
    name: faker.lorem.word(),
    description: faker.lorem.sentence(),
    type: RoleType.ADMIN,
    permissions: permissions,
  };
};
