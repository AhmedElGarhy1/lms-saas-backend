import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from './access-control.service';
import { PrismaService } from '../shared/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AccessControlService', () => {
  let service: AccessControlService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    role: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
    userOnCenter: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessControlService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AccessControlService>(AccessControlService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteRole', () => {
    const roleId = 'test-role-id';
    const mockRole = {
      id: roleId,
      name: 'Test Role',
      scope: 'GLOBAL',
    };

    it('should throw NotFoundException when role does not exist', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.deleteRole(roleId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: roleId },
      });
    });

    it('should throw BadRequestException when role is assigned to users in UserRole table', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.userRole.findMany.mockResolvedValue([
        { id: 'user-role-1', userId: 'user-1', roleId },
      ]);

      await expect(service.deleteRole(roleId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.userRole.findMany).toHaveBeenCalledWith({
        where: { roleId },
      });
    });

    it('should throw BadRequestException when role is assigned to users in UserOnCenter table', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.userRole.findMany.mockResolvedValue([]);
      mockPrismaService.userOnCenter.findMany.mockResolvedValue([
        { id: 'user-center-1', userId: 'user-1', roleId, centerId: 'center-1' },
      ]);

      await expect(service.deleteRole(roleId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.userOnCenter.findMany).toHaveBeenCalledWith({
        where: { roleId },
      });
    });

    it('should successfully delete role when not assigned to any users', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.userRole.findMany.mockResolvedValue([]);
      mockPrismaService.userOnCenter.findMany.mockResolvedValue([]);
      mockPrismaService.role.delete.mockResolvedValue(mockRole);

      const result = await service.deleteRole(roleId);

      expect(result).toEqual({ message: 'Role deleted successfully' });
      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({
        where: { id: roleId },
      });
    });

    it('should check both UserRole and UserOnCenter tables before deletion', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.userRole.findMany.mockResolvedValue([]);
      mockPrismaService.userOnCenter.findMany.mockResolvedValue([]);
      mockPrismaService.role.delete.mockResolvedValue(mockRole);

      await service.deleteRole(roleId);

      expect(mockPrismaService.userRole.findMany).toHaveBeenCalledWith({
        where: { roleId },
      });
      expect(mockPrismaService.userOnCenter.findMany).toHaveBeenCalledWith({
        where: { roleId },
      });
    });
  });
});
