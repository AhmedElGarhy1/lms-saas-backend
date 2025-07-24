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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { GradeLevelsService } from './grade-levels.service';
import {
  CreateGradeLevelRequestSchema,
  CreateGradeLevelRequestDto,
} from './dto/create-grade-level.dto';
import { GradeLevelResponseDto } from './dto/grade-level.dto';
import { AssignSubjectRequestDto } from './dto/assign-subject.dto';
import { ContextGuard } from '../access-control/guards/context.guard';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';
import { PaginationDocs } from '../shared/decorators/pagination-docs.decorator';

// Apply ContextGuard globally to ensure scopeType/scopeId are set
@UseGuards(ContextGuard)
@ApiTags('Grade Levels')
@Controller('grade-levels')
export class GradeLevelsController {
  private readonly logger = new Logger(GradeLevelsController.name);
  constructor(private readonly gradeLevelsService: GradeLevelsService) {}

  // Only Owners/Admins/Teachers can create grade levels
  @Post()
  @ApiOperation({ summary: 'Create a new grade level' })
  @ApiBody({ type: CreateGradeLevelRequestDto })
  @ApiResponse({ status: 201, description: 'Grade level created' })
  async createGradeLevel(
    @Body(new ZodValidationPipe(CreateGradeLevelRequestSchema))
    dto: CreateGradeLevelRequestDto,
  ) {
    return this.gradeLevelsService.createGradeLevel(dto);
  }

  // Only Owners/Admins/Teachers can update grade levels
  @Patch(':id')
  @ApiOperation({ summary: 'Update a grade level' })
  @ApiParam({ name: 'id', description: 'Grade level ID' })
  @ApiBody({ type: GradeLevelResponseDto })
  @ApiResponse({ status: 200, description: 'Grade level updated' })
  async updateGradeLevel(
    @Param('id') id: string,
    @Body() dto: GradeLevelResponseDto,
  ) {
    return this.gradeLevelsService.updateGradeLevel(id, dto);
  }

  // Only Owners/Admins can delete grade levels
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a grade level' })
  @ApiParam({ name: 'id', description: 'Grade level ID' })
  @ApiResponse({ status: 200, description: 'Grade level deleted' })
  async deleteGradeLevel(@Param('id') id: string) {
    return this.gradeLevelsService.deleteGradeLevel(id);
  }

  // Any member can view a grade level
  @Get(':id')
  @ApiOperation({ summary: 'Get grade level by ID' })
  @ApiParam({ name: 'id', description: 'Grade level ID' })
  @ApiResponse({ status: 200, description: 'Grade level found' })
  async getGradeLevelById(@Param('id') id: string) {
    return this.gradeLevelsService.getGradeLevelById(id);
  }

  // Any member can list grade levels
  @Get()
  @PaginationDocs({
    searchFields: ['name'],
    exactFields: ['centerId'],
  })
  @ApiOperation({ summary: 'List grade levels' })
  @ApiResponse({
    status: 200,
    description: 'List of grade levels',
  })
  async listGradeLevels(@Paginate() query: PaginateQuery) {
    return this.gradeLevelsService.listGradeLevels(query);
  }

  // Assignment management - Only Owners/Admins/Teachers can assign subjects
  @Post(':gradeLevelId/subjects')
  @ApiOperation({ summary: 'Assign a subject to a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiBody({ type: AssignSubjectRequestDto })
  @ApiResponse({ status: 201, description: 'Subject assigned' })
  async assignSubject(
    @Param('gradeLevelId') gradeLevelId: string,
    @Body() dto: AssignSubjectRequestDto,
  ) {
    return this.gradeLevelsService.assignSubject(gradeLevelId, dto);
  }

  @Delete(':gradeLevelId/subjects/:subjectId')
  @ApiOperation({ summary: 'Unassign a subject from a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  @ApiResponse({ status: 200, description: 'Subject unassigned' })
  async unassignSubject(
    @Param('gradeLevelId') gradeLevelId: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.gradeLevelsService.unassignSubject(gradeLevelId, subjectId);
  }

  // List assignments - Any member can view
  @Get(':gradeLevelId/subjects')
  @ApiOperation({ summary: 'List subjects in a grade level' })
  @ApiParam({ name: 'gradeLevelId', description: 'Grade level ID' })
  @ApiResponse({ status: 200, description: 'List of subjects' })
  async listSubjects(@Param('gradeLevelId') gradeLevelId: string) {
    return this.gradeLevelsService.listSubjects(gradeLevelId);
  }
}
