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
import { LevelsService } from '../services/levels.service';
import { CreateLevelDto } from '../dto/create-level.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';
import { PaginateLevelsDto } from '../dto/paginate-levels.dto';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { SerializeOptions } from '@nestjs/common';
import { LevelResponseDto } from '../dto/level-response.dto';

@ApiTags('Levels')
@Controller('levels')
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all levels for a center with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Levels retrieved successfully',
  })
  @Permissions(PERMISSIONS.LEVELS.READ)
  @SerializeOptions({ type: LevelResponseDto })
  async paginateLevels(
    @Query() paginateDto: PaginateLevelsDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.levelsService.paginateLevels(paginateDto, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.level' },
    });
  }

  @Get(':levelId')
  @ApiOperation({ summary: 'Get a specific level' })
  @ApiParam({ name: 'levelId', description: 'Level ID' })
  @ApiResponse({
    status: 200,
    description: 'Level retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Level not found',
  })
  @Permissions(PERMISSIONS.LEVELS.READ)
  @SerializeOptions({ type: LevelResponseDto })
  async getLevel(
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.levelsService.getLevel(levelId, actor, true); // includeDeleted: true for API endpoints
    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.level' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new level' })
  @ApiResponse({
    status: 201,
    description: 'Level created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @Permissions(PERMISSIONS.LEVELS.CREATE)
  @Transactional()
  @SerializeOptions({ type: LevelResponseDto })
  async createLevel(
    @Body() createLevelDto: CreateLevelDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.levelsService.createLevel(createLevelDto, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.created',
      args: { resource: 't.resources.level' },
    });
  }

  @Put(':levelId')
  @ApiOperation({ summary: 'Update a level' })
  @ApiParam({ name: 'levelId', description: 'Level ID' })
  @ApiResponse({
    status: 200,
    description: 'Level updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Level not found',
  })
  @Permissions(PERMISSIONS.LEVELS.UPDATE)
  @Transactional()
  @SerializeOptions({ type: LevelResponseDto })
  async updateLevel(
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @Body() data: UpdateLevelDto,
    @GetUser() actor: ActorUser,
  ) {
    const result = await this.levelsService.updateLevel(levelId, data, actor);
    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.level' },
    });
  }

  @Delete(':levelId')
  @ApiOperation({ summary: 'Delete a level' })
  @ApiParam({ name: 'levelId', description: 'Level ID' })
  @ApiResponse({
    status: 200,
    description: 'Level deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Level not found',
  })
  @Permissions(PERMISSIONS.LEVELS.DELETE)
  @Transactional()
  async deleteLevel(
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.levelsService.deleteLevel(levelId, actor);
    return ControllerResponse.message({
      key: 't.messages.deleted',
      args: { resource: 't.resources.level' },
    });
  }

  @Patch(':levelId/restore')
  @UpdateApiResponses('Restore deleted level')
  @ApiParam({ name: 'levelId', description: 'Level ID', type: String })
  @Permissions(PERMISSIONS.LEVELS.RESTORE)
  @Transactional()
  @SerializeOptions({ type: LevelResponseDto })
  async restoreLevel(
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @GetUser() actor: ActorUser,
  ) {
    await this.levelsService.restoreLevel(levelId, actor);
    return ControllerResponse.message({
      key: 't.messages.restored',
      args: { resource: 't.resources.level' },
    });
  }
}
