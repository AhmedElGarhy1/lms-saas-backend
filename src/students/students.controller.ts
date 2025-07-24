import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentRequestDto } from './dto/create-student.dto';
import { UpdateStudentRequestDto } from './dto/update-student.dto';
import { AddStudentToCenterRequestDto } from './dto/add-student-to-center.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { PERMISSIONS } from '../access-control/constants/permissions';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';
import { Prisma, StudentGrade } from '@prisma/client';
import { CreateStudentResponseDto } from './dto/student-response.dto';
import { UpdateStudentResponseDto } from './dto/student-response.dto';
import { AddStudentToCenterResponseDto } from './dto/student-response.dto';
import { CurrentUser } from '../shared/types/current-user.type';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Permissions(PERMISSIONS.STUDENT.CREATE.action)
  @ApiOperation({ summary: 'Create a new student' })
  @ApiResponse({
    status: 201,
    description: 'Student created successfully',
    type: CreateStudentResponseDto,
  })
  @ApiBody({ type: CreateStudentRequestDto })
  async createStudent(
    @Body() dto: CreateStudentRequestDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.studentsService.createStudent(dto, user.id);
  }

  @Get()
  @Permissions(PERMISSIONS.STUDENT.VIEW.action)
  @ApiOperation({ summary: 'Get all students' })
  @ApiQuery({
    name: 'centerId',
    required: false,
    description: 'Filter by center ID',
  })
  @ApiResponse({ status: 200, description: 'List of students' })
  findAll(@GetUser() user: any, @Query('centerId') centerId?: string) {
    if (centerId) {
      return this.studentsService.getStudentsByCenter(centerId);
    }
    return this.studentsService.getAllStudents(user);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.STUDENT.VIEW.action)
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student details' })
  findOne(@Param('id') id: string) {
    return this.studentsService.getStudentWithDetails(id);
  }

  @Get(':id/centers')
  @Permissions(PERMISSIONS.STUDENT.VIEW.action)
  @ApiOperation({ summary: 'Get all centers where student is enrolled' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'List of centers' })
  getStudentCenters(@Param('id') id: string) {
    return this.studentsService.getStudentCenters(id);
  }

  @Get(':id/stats')
  @Permissions(PERMISSIONS.STUDENT.VIEW.action)
  @ApiOperation({ summary: 'Get student statistics' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiQuery({
    name: 'centerId',
    required: false,
    description: 'Filter stats by center ID',
  })
  @ApiResponse({ status: 200, description: 'Student statistics' })
  getStudentStats(
    @Param('id') id: string,
    @Query('centerId') centerId?: string,
  ) {
    return this.studentsService.getStudentStats(id, centerId);
  }

  @Post(':id/centers/:centerId')
  @Permissions(PERMISSIONS.STUDENT.ASSIGN_GROUP.action)
  @ApiOperation({ summary: 'Add a student to a center' })
  @ApiResponse({
    status: 200,
    description: 'Student added to center successfully',
    type: AddStudentToCenterResponseDto,
  })
  @ApiBody({ type: AddStudentToCenterRequestDto })
  async addStudentToCenter(
    @Param('id') id: string,
    @Param('centerId') centerId: string,
    @Body() dto: AddStudentToCenterRequestDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.studentsService.addStudentToCenter(id, centerId, dto);
  }

  @Delete(':id/centers/:centerId')
  @Permissions(PERMISSIONS.STUDENT.DELETE.action)
  @ApiOperation({ summary: 'Remove student from a center' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiResponse({ status: 200, description: 'Student removed from center' })
  removeFromCenter(
    @Param('id') id: string,
    @Param('centerId') centerId: string,
  ) {
    // First get the student to get the userId
    return this.studentsService.getStudentWithDetails(id).then((student) => {
      if (!student.id) {
        throw new BadRequestException('Student user not found');
      }
      return this.studentsService.removeStudentFromCenter(student.id, centerId);
    });
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.STUDENT.UPDATE.action)
  @ApiOperation({ summary: 'Update a student' })
  @ApiResponse({
    status: 200,
    description: 'Student updated successfully',
    type: UpdateStudentResponseDto,
  })
  @ApiBody({ type: UpdateStudentRequestDto })
  async updateStudent(
    @Param('id') id: string,
    @Body() dto: UpdateStudentRequestDto,
    @GetUser() user: CurrentUser,
  ) {
    return this.studentsService.updateStudent(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.STUDENT.DELETE.action)
  @ApiOperation({ summary: 'Delete a student' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  remove(@Param('id') id: string) {
    return this.studentsService.deleteStudent(id);
  }
}
