import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { ClassesService } from '../services/classes.service';
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { PaginateClassesDto } from '../dto/paginate-classes.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { ClassResponseDto } from '../dto/class-response.dto';

@ApiTags('Classes')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all classes for a center with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Classes retrieved successfully',
  })
  @Permissions(PERMISSIONS.CLASSES.READ)
  @SerializeOptions({ type: ClassResponseDto })
  async paginateClasses(
    @Query() paginateDto: PaginateClassesDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.paginateClasses(
      paginateDto,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.class' },
    });
  }

  @Get(':classId')
  @ApiOperation({ summary: 'Get a specific class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Class retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found',
  })
  @Permissions(PERMISSIONS.CLASSES.READ)
  @SerializeOptions({ type: ClassResponseDto })
  async getClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.getClass(classId, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.class' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({
    status: 201,
    description: 'Class created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @Permissions(PERMISSIONS.CLASSES.CREATE)
  @Transactional()
  @SerializeOptions({ type: ClassResponseDto })
  async createClass(
    @Body() createClassDto: CreateClassDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.createClass(createClassDto, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.created',
      args: { resource: 't.resources.class' },
    });
  }

  @Put(':classId')
  @ApiOperation({ summary: 'Update a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Class updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found',
  })
  @Permissions(PERMISSIONS.CLASSES.UPDATE)
  @Transactional()
  @SerializeOptions({ type: ClassResponseDto })
  async updateClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() data: UpdateClassDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.updateClass(classId, data, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.class' },
    });
  }

  @Delete(':classId')
  @ApiOperation({ summary: 'Delete a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Class deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found',
  })
  @Permissions(PERMISSIONS.CLASSES.DELETE)
  @Transactional()
  async deleteClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.classesService.deleteClass(classId, actor);
    return ControllerResponse.message({
      key: 't.messages.deleted',
      args: { resource: 't.resources.class' },
    });
  }

  @Patch(':classId/restore')
  @UpdateApiResponses('Restore deleted class')
  @ApiParam({ name: 'classId', description: 'Class ID', type: String })
  @Permissions(PERMISSIONS.CLASSES.RESTORE)
  @Transactional()
  @SerializeOptions({ type: ClassResponseDto })
  async restoreClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.classesService.restoreClass(classId, actor);
    return ControllerResponse.message({
      key: 't.messages.restored',
      args: { resource: 't.resources.class' },
    });
  }
}
