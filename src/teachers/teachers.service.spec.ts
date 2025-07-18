import { Test, TestingModule } from '@nestjs/testing';
import { TeachersService } from './teachers.service';
import { PrismaService } from '../shared/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/teacher.dto';
import { User } from '@prisma/client';

describe('TeachersService', () => {
  let service: TeachersService;
  let prismaService: PrismaService;
  let logger: Logger;

  const mockPrismaService = {
    teacher: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userRole: {
      findFirst: jest.fn(),
    },
    center: {
      findFirst: jest.fn(),
    },
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'teacher@example.com',
    password: 'hashedPassword',
    name: 'John Doe',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    failedLoginAttempts: 0,
    lockoutUntil: null,
    twoFactorSecret: null,
    twoFactorEnabled: false,
  };

  const mockTeacher = {
    id: 'teacher-1',
    userId: 'user-1',
    biography: 'Experienced teacher',
    experienceYears: 5,
    specialization: 'Mathematics',
    profileViews: 10,
    rating: 4.5,
    studentsCount: 25,
    centersCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-1',
      name: 'John Doe',
      email: 'teacher@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<TeachersService>(TeachersService);
    prismaService = module.get<PrismaService>(PrismaService);
    logger = module.get<Logger>(WINSTON_MODULE_PROVIDER);

    // Mock the private method
    jest
      .spyOn(service as any, 'isAdminOrCenterOwner')
      .mockImplementation(async (user: User) => {
        if (user.id === 'user-1') {
          return true; // Mock admin user
        }
        return false; // Mock regular user
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTeacher', () => {
    const createTeacherDto: CreateTeacherDto = {
      userId: 'user-1',
      biography: 'Experienced teacher',
      experienceYears: 5,
      specialization: 'Mathematics',
    };

    it('should create a teacher profile successfully', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.teacher.create.mockResolvedValue(mockTeacher);

      const result = await service.createTeacher(createTeacherDto, mockUser);

      expect(result).toEqual({
        id: mockTeacher.id,
        userId: mockTeacher.userId,
        biography: mockTeacher.biography,
        experienceYears: mockTeacher.experienceYears,
        specialization: mockTeacher.specialization,
        profileViews: mockTeacher.profileViews,
        rating: mockTeacher.rating,
        studentsCount: mockTeacher.studentsCount,
        centersCount: mockTeacher.centersCount,
        createdAt: mockTeacher.createdAt,
        updatedAt: mockTeacher.updatedAt,
        user: mockTeacher.user,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Teacher profile created', {
        teacherId: mockTeacher.id,
        userId: mockTeacher.userId,
        createdBy: mockUser.id,
        action: 'CREATE_TEACHER',
      });
    });

    it('should throw ConflictException if teacher profile already exists', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(mockTeacher);

      await expect(
        service.createTeacher(createTeacherDto, mockUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createTeacher(createTeacherDto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTeacherById', () => {
    it('should return teacher profile by ID', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(mockTeacher);
      mockPrismaService.userRole.findFirst.mockResolvedValue({ name: 'admin' });

      const result = await service.getTeacherById('teacher-1', mockUser);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockTeacher.id);
    });

    it('should throw NotFoundException if teacher not found', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(null);

      await expect(
        service.getTeacherById('teacher-1', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user cannot access teacher profile', async () => {
      const otherUser = { ...mockUser, id: 'user-2' };
      mockPrismaService.teacher.findUnique.mockResolvedValue(mockTeacher);

      await expect(
        service.getTeacherById('teacher-1', otherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTeacherByUserId', () => {
    it('should return teacher profile by user ID', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(mockTeacher);
      mockPrismaService.userRole.findFirst.mockResolvedValue({ name: 'admin' });

      const result = await service.getTeacherByUserId('user-1', mockUser);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockTeacher.userId);
    });

    it('should throw NotFoundException if teacher not found', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(null);

      await expect(
        service.getTeacherByUserId('user-1', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTeacher', () => {
    const updateTeacherDto: UpdateTeacherDto = {
      biography: 'Updated biography',
      experienceYears: 6,
      specialization: 'Advanced Mathematics',
    };

    it('should update teacher profile successfully', async () => {
      const updatedTeacher = { ...mockTeacher, ...updateTeacherDto };
      mockPrismaService.teacher.findUnique.mockResolvedValue(mockTeacher);
      mockPrismaService.teacher.update.mockResolvedValue(updatedTeacher);
      mockPrismaService.userRole.findFirst.mockResolvedValue({ name: 'admin' });

      const result = await service.updateTeacher(
        'teacher-1',
        updateTeacherDto,
        mockUser,
      );

      expect(result.biography).toBe(updateTeacherDto.biography);
      expect(result.experienceYears).toBe(updateTeacherDto.experienceYears);
      expect(mockLogger.info).toHaveBeenCalledWith('Teacher profile updated', {
        teacherId: 'teacher-1',
        userId: mockTeacher.userId,
        updatedBy: mockUser.id,
        changes: updateTeacherDto,
        action: 'UPDATE_TEACHER',
      });
    });

    it('should throw NotFoundException if teacher not found', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTeacher('teacher-1', updateTeacherDto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllTeachers', () => {
    it('should return paginated list of teachers', async () => {
      const teachers = [mockTeacher];
      mockPrismaService.teacher.findMany.mockResolvedValue(teachers);
      mockPrismaService.teacher.count.mockResolvedValue(1);
      mockPrismaService.userRole.findFirst.mockResolvedValue({ name: 'admin' });

      const result = await service.getAllTeachers(1, 10, mockUser);

      expect(result.teachers).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should throw ForbiddenException if user is not admin or center owner', async () => {
      const regularUser = { ...mockUser, id: 'user-2' };
      mockPrismaService.userRole.findFirst.mockResolvedValue(null);
      mockPrismaService.center.findFirst.mockResolvedValue(null);

      await expect(service.getAllTeachers(1, 10, regularUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('incrementProfileViews', () => {
    it('should increment profile views successfully', async () => {
      const updatedTeacher = { ...mockTeacher, profileViews: 11 };
      mockPrismaService.teacher.findUnique.mockResolvedValue(mockTeacher);
      mockPrismaService.teacher.update.mockResolvedValue(updatedTeacher);

      const result = await service.incrementProfileViews('teacher-1', mockUser);

      expect(result.profileViews).toBe(11);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Teacher profile views incremented',
        {
          teacherId: 'teacher-1',
          userId: mockTeacher.userId,
          viewedBy: mockUser.id,
          newViewCount: 11,
          action: 'INCREMENT_PROFILE_VIEWS',
        },
      );
    });

    it('should throw NotFoundException if teacher not found', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(null);

      await expect(
        service.incrementProfileViews('teacher-1', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTeacher', () => {
    it('should delete teacher profile successfully', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(mockTeacher);
      mockPrismaService.teacher.delete.mockResolvedValue(mockTeacher);
      mockPrismaService.userRole.findFirst.mockResolvedValue({ name: 'admin' });

      await service.deleteTeacher('teacher-1', mockUser);

      expect(mockPrismaService.teacher.delete).toHaveBeenCalledWith({
        where: { id: 'teacher-1' },
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Teacher profile deleted', {
        teacherId: 'teacher-1',
        userId: mockTeacher.userId,
        deletedBy: mockUser.id,
        action: 'DELETE_TEACHER',
      });
    });

    it('should throw NotFoundException if teacher not found', async () => {
      mockPrismaService.teacher.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteTeacher('teacher-1', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not admin or center owner', async () => {
      const regularUser = { ...mockUser, id: 'user-2' };
      mockPrismaService.teacher.findUnique.mockResolvedValue(mockTeacher);
      mockPrismaService.userRole.findFirst.mockResolvedValue(null);
      mockPrismaService.center.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTeacher('teacher-1', regularUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
