import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PermissionsGuard } from '../shared/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new student' })
  @ApiResponse({ status: 201, type: StudentResponseDto })
  @UseGuards(PermissionsGuard)
  @Permissions('students:create')
  async create(
    @Body() dto: CreateStudentDto,
    @GetUser() user: CurrentUserType,
  ): Promise<StudentResponseDto> {
    return this.studentsService.createStudent(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  @UseGuards(PermissionsGuard)
  @Permissions('students:read')
  async getById(
    @Param('id') id: string,
    @GetUser() user: CurrentUserType,
  ): Promise<StudentResponseDto> {
    return this.studentsService.getStudentById(id, user);
  }

  @Get()
  @ApiOperation({ summary: 'List students (by center, teacher, or all)' })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @ApiQuery({ name: 'teacherId', required: false, type: String })
  @ApiQuery({ name: 'grade', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    schema: { example: { students: [], total: 0, page: 1, limit: 10 } },
  })
  @UseGuards(PermissionsGuard)
  @Permissions('students:read')
  async list(
    @Query() query: QueryStudentsDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.studentsService.listStudents(query, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update student by ID' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  @UseGuards(PermissionsGuard)
  @Permissions('students:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @GetUser() user: CurrentUserType,
  ): Promise<StudentResponseDto> {
    return this.studentsService.updateStudent(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete student by ID' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 204, description: 'Student deleted' })
  @UseGuards(PermissionsGuard)
  @Permissions('students:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @GetUser() user: CurrentUserType,
  ): Promise<void> {
    await this.studentsService.deleteStudent(id, user);
  }
}
