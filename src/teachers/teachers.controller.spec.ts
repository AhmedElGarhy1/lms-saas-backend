import { Test, TestingModule } from '@nestjs/testing';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import {
  CreateTeacherDto,
  UpdateTeacherDto,
  TeacherResponseDto,
  TeacherListResponseDto,
} from './dto/teacher.dto';
import { User } from '@prisma/client';

describe('TeachersController', () => {
  let controller: TeachersController;
  let service: TeachersService;

  const mockTeachersService = {
    createTeacher: jest.fn(),
    getTeacherById: jest.fn(),
    getTeacherByUserId: jest.fn(),
    updateTeacher: jest.fn(),
    getAllTeachers: jest.fn(),
    incrementProfileViews: jest.fn(),
    deleteTeacher: jest.fn(),
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

  const mockTeacherResponse: TeacherResponseDto = {
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
      controllers: [TeachersController],
      providers: [
        {
          provide: TeachersService,
          useValue: mockTeachersService,
        },
      ],
    }).compile();

    controller = module.get<TeachersController>(TeachersController);
    service = module.get<TeachersService>(TeachersService);
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

    it('should create a teacher profile', async () => {
      mockTeachersService.createTeacher.mockResolvedValue(mockTeacherResponse);

      const result = await controller.createTeacher(createTeacherDto, mockUser);

      expect(result).toEqual(mockTeacherResponse);
      expect(service.createTeacher).toHaveBeenCalledWith(
        createTeacherDto,
        mockUser,
      );
    });
  });

  describe('getTeacherById', () => {
    it('should return teacher profile by ID', async () => {
      mockTeachersService.getTeacherById.mockResolvedValue(mockTeacherResponse);

      const result = await controller.getTeacherById('teacher-1', mockUser);

      expect(result).toEqual(mockTeacherResponse);
      expect(service.getTeacherById).toHaveBeenCalledWith(
        'teacher-1',
        mockUser,
      );
    });
  });

  describe('getTeacherByUserId', () => {
    it('should return teacher profile by user ID', async () => {
      mockTeachersService.getTeacherByUserId.mockResolvedValue(
        mockTeacherResponse,
      );

      const result = await controller.getTeacherByUserId('user-1', mockUser);

      expect(result).toEqual(mockTeacherResponse);
      expect(service.getTeacherByUserId).toHaveBeenCalledWith(
        'user-1',
        mockUser,
      );
    });
  });

  describe('updateTeacher', () => {
    const updateTeacherDto: UpdateTeacherDto = {
      biography: 'Updated biography',
      experienceYears: 6,
      specialization: 'Advanced Mathematics',
    };

    it('should update teacher profile', async () => {
      const updatedTeacher = { ...mockTeacherResponse, ...updateTeacherDto };
      mockTeachersService.updateTeacher.mockResolvedValue(updatedTeacher);

      const result = await controller.updateTeacher(
        'teacher-1',
        updateTeacherDto,
        mockUser,
      );

      expect(result).toEqual(updatedTeacher);
      expect(service.updateTeacher).toHaveBeenCalledWith(
        'teacher-1',
        updateTeacherDto,
        mockUser,
      );
    });
  });

  describe('getAllTeachers', () => {
    it('should return paginated list of teachers', async () => {
      const mockListResponse: TeacherListResponseDto = {
        teachers: [mockTeacherResponse],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockTeachersService.getAllTeachers.mockResolvedValue(mockListResponse);

      const result = await controller.getAllTeachers(1, 10, mockUser);

      expect(result).toEqual(mockListResponse);
      expect(service.getAllTeachers).toHaveBeenCalledWith(1, 10, mockUser);
    });

    it('should use default pagination values', async () => {
      const mockListResponse: TeacherListResponseDto = {
        teachers: [mockTeacherResponse],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockTeachersService.getAllTeachers.mockResolvedValue(mockListResponse);

      const result = await controller.getAllTeachers(
        undefined,
        undefined,
        mockUser,
      );

      expect(result).toEqual(mockListResponse);
      expect(service.getAllTeachers).toHaveBeenCalledWith(1, 10, mockUser);
    });
  });

  describe('incrementProfileViews', () => {
    it('should increment profile views', async () => {
      const updatedTeacher = { ...mockTeacherResponse, profileViews: 11 };
      mockTeachersService.incrementProfileViews.mockResolvedValue(
        updatedTeacher,
      );

      const result = await controller.incrementProfileViews(
        'teacher-1',
        mockUser,
      );

      expect(result).toEqual(updatedTeacher);
      expect(service.incrementProfileViews).toHaveBeenCalledWith(
        'teacher-1',
        mockUser,
      );
    });
  });

  describe('deleteTeacher', () => {
    it('should delete teacher profile', async () => {
      mockTeachersService.deleteTeacher.mockResolvedValue(undefined);

      const result = await controller.deleteTeacher('teacher-1', mockUser);

      expect(result).toBeUndefined();
      expect(service.deleteTeacher).toHaveBeenCalledWith('teacher-1', mockUser);
    });
  });
});
