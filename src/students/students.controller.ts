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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AddStudentToCenterDto } from './dto/add-student-to-center.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { PERMISSIONS } from '../access-control/constants/permissions';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Permissions(PERMISSIONS.STUDENT.CREATE)
  @ApiOperation({ summary: 'Create a new student' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.createStudent(createStudentDto);
  }

  @Get()
  @Permissions(PERMISSIONS.STUDENT.VIEW)
  @ApiOperation({ summary: 'Get all students' })
  @ApiQuery({
    name: 'centerId',
    required: false,
    description: 'Filter by center ID',
  })
  @ApiResponse({ status: 200, description: 'List of students' })
  findAll(@Query('centerId') centerId?: string) {
    if (centerId) {
      return this.studentsService.getStudentsByCenter(centerId);
    }
    // TODO: Implement getAllStudents method for when no centerId is provided
    return this.studentsService.getAllStudents();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.STUDENT.VIEW)
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student details' })
  findOne(@Param('id') id: string) {
    return this.studentsService.getStudentWithDetails(id);
  }

  @Get(':id/centers')
  @Permissions(PERMISSIONS.STUDENT.VIEW)
  @ApiOperation({ summary: 'Get all centers where student is enrolled' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'List of centers' })
  getStudentCenters(@Param('id') id: string) {
    return this.studentsService.getStudentCenters(id);
  }

  @Get(':id/stats')
  @Permissions(PERMISSIONS.STUDENT.VIEW)
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
  @Permissions(PERMISSIONS.STUDENT.ASSIGN_GROUP)
  @ApiOperation({ summary: 'Add student to a center' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiResponse({ status: 201, description: 'Student added to center' })
  addToCenter(
    @Param('id') id: string,
    @Param('centerId') centerId: string,
    @Body() dto: AddStudentToCenterDto,
  ) {
    // First get the student to get the userId
    return this.studentsService.getStudentWithDetails(id).then((student) => {
      return this.studentsService.addStudentToCenter(
        student.user.id,
        centerId,
        dto,
      );
    });
  }

  @Delete(':id/centers/:centerId')
  @Permissions(PERMISSIONS.STUDENT.DELETE)
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
      return this.studentsService.removeStudentFromCenter(
        student.user.id,
        centerId,
      );
    });
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.STUDENT.UPDATE)
  @ApiOperation({ summary: 'Update student information' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.updateStudent(id, updateStudentDto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.STUDENT.DELETE)
  @ApiOperation({ summary: 'Delete a student' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  remove(@Param('id') id: string) {
    return this.studentsService.deleteStudent(id);
  }
}
