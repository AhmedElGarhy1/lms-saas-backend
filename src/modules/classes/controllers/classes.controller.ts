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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { ClassesService } from '../services/classes.service';
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { PaginateClassesDto } from '../dto/paginate-classes.dto';
import { ClassIdParamDto } from '../dto/class-id-param.dto';
import { ChangeClassStatusDto } from '../dto/change-class-status.dto';
import { ClassStatus } from '../enums/class-status.enum';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser, ManagerialOnly } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { ClassResponseDto } from '../dto/class-response.dto';
import { StudentPaymentStrategyDto } from '../dto/student-payment-strategy.dto';
import { TeacherPaymentStrategyDto } from '../dto/teacher-payment-strategy.dto';
import { UpdateAbsenteePolicyDto } from '../dto/update-absentee-policy.dto';
import { ApiBody } from '@nestjs/swagger';

@ApiTags('Classes')
@Controller('classes')
@ManagerialOnly()
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
    @Param() params: ClassIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.getClass(
      params.classId,
      actor,
      true,
    ); // includeDeleted: true for API endpoints
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
    @Param() params: ClassIdParamDto,
    @Body() data: UpdateClassDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.updateClass(
      params.classId,
      data,
      actor,
    );
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
    @Param() params: ClassIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.classesService.deleteClass(params.classId, actor);
    return ControllerResponse.message({
      key: 't.messages.deleted',
      args: { resource: 't.resources.class' },
    });
  }

  @Get(':classId/available-statuses')
  @ApiOperation({ summary: 'Get available status transitions for a class' })
  @ApiParam({ name: 'classId', description: 'Class ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Available statuses retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(ClassStatus),
          },
        },
      },
    },
  })
  @Permissions(PERMISSIONS.CLASSES.READ)
  async getAvailableStatuses(
    @Param() params: ClassIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.getAvailableStatuses(
      params.classId,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.status' },
    });
  }

  @Patch(':classId/status')
  @ApiOperation({ summary: 'Change class status' })
  @ApiParam({ name: 'classId', description: 'Class ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Class status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition',
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found',
  })
  @Permissions(PERMISSIONS.CLASSES.UPDATE)
  @Transactional()
  @SerializeOptions({ type: ClassResponseDto })
  async changeClassStatus(
    @Param() params: ClassIdParamDto,
    @Body() changeStatusDto: ChangeClassStatusDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.changeClassStatus(
      params.classId,
      changeStatusDto,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
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
    @Param() params: ClassIdParamDto,
    @GetUser() actor: ActorUser,
  ) {
    await this.classesService.restoreClass(params.classId, actor);
    return ControllerResponse.message({
      key: 't.messages.restored',
      args: { resource: 't.resources.class' },
    });
  }

  @Put(':classId/student-payment')
  @ApiOperation({ summary: 'Update student payment strategy for a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: StudentPaymentStrategyDto })
  @ApiResponse({
    status: 200,
    description: 'Student payment strategy updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Class or payment strategy not found',
  })
  @Permissions(PERMISSIONS.CLASSES.UPDATE)
  @Transactional()
  @SerializeOptions({ type: ClassResponseDto })
  async updateStudentPayment(
    @Param() params: ClassIdParamDto,
    @Body() dto: StudentPaymentStrategyDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.updateStudentPaymentStrategy(
      params.classId,
      dto,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.studentPaymentStrategy' },
    });
  }

  @Put(':classId/teacher-payment')
  @ApiOperation({ summary: 'Update teacher payment strategy for a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: TeacherPaymentStrategyDto })
  @ApiResponse({
    status: 200,
    description: 'Teacher payment strategy updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Class or payment strategy not found',
  })
  @Permissions(PERMISSIONS.CLASSES.UPDATE)
  @Transactional()
  @SerializeOptions({ type: ClassResponseDto })
  async updateTeacherPayment(
    @Param() params: ClassIdParamDto,
    @Body() dto: TeacherPaymentStrategyDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.updateTeacherPaymentStrategy(
      params.classId,
      dto,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.teacherPaymentStrategy' },
    });
  }

  // ===== ABSENTEE POLICY ENDPOINTS =====

  @Put(':classId/absentee-policy')
  @Permissions(PERMISSIONS.CLASSES.UPDATE)
  @ApiOperation({
    summary: 'Update absentee payment policy for a class',
    description:
      'Set STRICT, FLEXIBLE, or MANUAL policy for handling absent students',
  })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Absentee policy updated successfully',
  })
  @Transactional()
  @SerializeOptions({ type: ClassResponseDto })
  async updateAbsenteePolicy(
    @Param() params: ClassIdParamDto,
    @Body() dto: UpdateAbsenteePolicyDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.classesService.updateAbsenteePolicy(
      params.classId,
      dto.absenteePolicy,
      actor,
    );
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.absenteePolicy' },
    });
  }
}
