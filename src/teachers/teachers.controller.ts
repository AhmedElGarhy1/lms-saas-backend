import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Logger,
  UseGuards,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/teacher.dto';
import { UpdateTeacherDto } from './dto/teacher.dto';
import { TeacherResponseDto } from './dto/teacher.dto';
import { TeacherListResponseDto } from './dto/teacher.dto';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

@ApiTags('Teachers')
@ApiBearerAuth()
@Controller('teachers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new teacher profile',
    description:
      'Creates a new teacher profile for an existing user. Only admins and center owners can create teacher profiles.',
  })
  @ApiBody({
    type: CreateTeacherDto,
    description: 'Teacher profile data',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Teacher profile created successfully',
    type: TeacherResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Teacher profile already exists for this user',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @Permissions('teachers:create')
  async createTeacher(
    @Body() createTeacherDto: CreateTeacherDto,
    @GetUser() currentUser: CurrentUserType,
  ): Promise<TeacherResponseDto> {
    return this.teachersService.createTeacher(createTeacherDto, currentUser);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get teacher profile by ID',
    description:
      'Retrieves a teacher profile by its ID. Users can only access their own profile unless they are admins or center owners.',
  })
  @ApiParam({
    name: 'id',
    description: 'Teacher profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher profile retrieved successfully',
    type: TeacherResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @Permissions('teachers:read')
  async getTeacherById(
    @Param('id') id: string,
    @GetUser() currentUser: CurrentUserType,
  ): Promise<TeacherResponseDto> {
    return this.teachersService.getTeacherById(id, currentUser);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get teacher profile by user ID',
    description:
      'Retrieves a teacher profile by user ID. Users can only access their own profile unless they are admins or center owners.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher profile retrieved successfully',
    type: TeacherResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @Permissions('teachers:read')
  async getTeacherByUserId(
    @Param('userId') userId: string,
    @GetUser() currentUser: CurrentUserType,
  ): Promise<TeacherResponseDto> {
    return this.teachersService.getTeacherByUserId(userId, currentUser);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update teacher profile',
    description:
      'Updates a teacher profile. Users can only update their own profile unless they are admins or center owners.',
  })
  @ApiParam({
    name: 'id',
    description: 'Teacher profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateTeacherDto,
    description: 'Updated teacher profile data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher profile updated successfully',
    type: TeacherResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @Permissions('teachers:update')
  async updateTeacher(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @GetUser() currentUser: CurrentUserType,
  ): Promise<TeacherResponseDto> {
    return this.teachersService.updateTeacher(
      id,
      updateTeacherDto,
      currentUser,
    );
  }

  @Permissions('teachers:read')
  @Get()
  @ApiOperation({
    summary: 'Get all teachers',
    description:
      'Retrieves a paginated list of all teachers. Only admins and center owners can access this endpoint.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teachers list retrieved successfully',
    type: TeacherListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async getAllTeachers(
    @Paginate() query: PaginateQuery,
    @GetUser() currentUser: CurrentUserType,
  ): Promise<TeacherListResponseDto> {
    return this.teachersService.getAllTeachers(query, currentUser);
  }

  @Post(':id/views')
  @ApiOperation({
    summary: 'Increment teacher profile views',
    description:
      'Increments the profile view counter for a teacher. This endpoint can be called by any authenticated user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Teacher profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile views incremented successfully',
    type: TeacherResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  @Permissions('teachers:read')
  @HttpCode(HttpStatus.OK)
  async incrementProfileViews(
    @Param('id') id: string,
    @GetUser() currentUser: CurrentUserType,
  ): Promise<TeacherResponseDto> {
    return this.teachersService.incrementProfileViews(id, currentUser);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete teacher profile',
    description:
      'Deletes a teacher profile. Only admins and center owners can delete teacher profiles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Teacher profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Teacher profile deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @Permissions('teachers:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTeacher(
    @Param('id') id: string,
    @GetUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.teachersService.deleteTeacher(id, currentUser);
  }
}
