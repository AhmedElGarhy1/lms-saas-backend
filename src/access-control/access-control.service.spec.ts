import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from './access-control.service';
import { PrismaService } from '../shared/prisma.service';
import { BadRequestException } from '@nestjs/common';

const mockPrisma = {
  userOnCenter: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  userPermission: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('AccessControlService', () => {
  let service: AccessControlService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessControlService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AccessControlService>(AccessControlService);
  });

  describe('assignRole', () => {
    it('should assign a role if not already assigned', async () => {
      mockPrisma.userOnCenter.findFirst.mockResolvedValue(null);
      mockPrisma.userOnCenter.create.mockResolvedValue({ id: 'rel1' });
      const result = await service.assignRole({
        userId: 'u1',
        roleId: 'r1',
        centerId: 'c1',
      });
      expect(result).toEqual({ message: 'Role assigned', id: 'rel1' });
    });
    it('should throw if already assigned', async () => {
      mockPrisma.userOnCenter.findFirst.mockResolvedValue({});
      await expect(
        service.assignRole({ userId: 'u1', roleId: 'r1', centerId: 'c1' }),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw if no scope', async () => {
      await expect(
        service.assignRole({ userId: 'u1', roleId: 'r1' }),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw if both scopes', async () => {
      await expect(
        service.assignRole({
          userId: 'u1',
          roleId: 'r1',
          centerId: 'c1',
          teacherId: 't1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeRole', () => {
    it('should remove a role if exists', async () => {
      mockPrisma.userOnCenter.deleteMany.mockResolvedValue({ count: 1 });
      const result = await service.removeRole({
        userId: 'u1',
        roleId: 'r1',
        centerId: 'c1',
      });
      expect(result).toEqual({ message: 'Role removed' });
    });
    it('should throw if not found', async () => {
      mockPrisma.userOnCenter.deleteMany.mockResolvedValue({ count: 0 });
      await expect(
        service.removeRole({ userId: 'u1', roleId: 'r1', centerId: 'c1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignPermission', () => {
    it('should assign user permission if not already assigned', async () => {
      mockPrisma.userPermission.findFirst.mockResolvedValue(null);
      mockPrisma.userPermission.create.mockResolvedValue({ id: 'up1' });
      const result = await service.assignPermission({
        userId: 'u1',
        permissionId: 'p1',
        centerId: 'c1',
      });
      expect(result).toEqual({
        message: 'Permission assigned to user',
        id: 'up1',
      });
    });
    it('should throw if user permission already assigned', async () => {
      mockPrisma.userPermission.findFirst.mockResolvedValue({});
      await expect(
        service.assignPermission({
          userId: 'u1',
          permissionId: 'p1',
          centerId: 'c1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
    it('should assign permission to role if not already assigned', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r1',
        permissions: [],
      });
      mockPrisma.role.update.mockResolvedValue({});
      const result = await service.assignPermission({
        roleId: 'r1',
        permissionId: 'p1',
      });
      expect(result).toEqual({ message: 'Permission assigned to role' });
    });
    it('should throw if permission already assigned to role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r1',
        permissions: [{ id: 'p1' }],
      });
      await expect(
        service.assignPermission({ roleId: 'r1', permissionId: 'p1' }),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw if neither userId nor roleId', async () => {
      await expect(
        service.assignPermission({ permissionId: 'p1' }),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw if both userId and roleId', async () => {
      await expect(
        service.assignPermission({
          userId: 'u1',
          roleId: 'r1',
          permissionId: 'p1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removePermission', () => {
    it('should remove user permission if exists', async () => {
      mockPrisma.userPermission.deleteMany.mockResolvedValue({ count: 1 });
      const result = await service.removePermission({
        userId: 'u1',
        permissionId: 'p1',
        centerId: 'c1',
      });
      expect(result).toEqual({ message: 'Permission removed from user' });
    });
    it('should throw if user permission not found', async () => {
      mockPrisma.userPermission.deleteMany.mockResolvedValue({ count: 0 });
      await expect(
        service.removePermission({
          userId: 'u1',
          permissionId: 'p1',
          centerId: 'c1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
    it('should remove permission from role if assigned', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r1',
        permissions: [{ id: 'p1' }],
      });
      mockPrisma.role.update.mockResolvedValue({});
      const result = await service.removePermission({
        roleId: 'r1',
        permissionId: 'p1',
      });
      expect(result).toEqual({ message: 'Permission removed from role' });
    });
    it('should throw if permission not assigned to role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'r1',
        permissions: [],
      });
      await expect(
        service.removePermission({ roleId: 'r1', permissionId: 'p1' }),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw if neither userId nor roleId', async () => {
      await expect(
        service.removePermission({ permissionId: 'p1' }),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw if both userId and roleId', async () => {
      await expect(
        service.removePermission({
          userId: 'u1',
          roleId: 'r1',
          permissionId: 'p1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
