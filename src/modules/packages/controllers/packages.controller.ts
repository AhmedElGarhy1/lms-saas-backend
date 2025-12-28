import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Transactional } from '@nestjs-cls/transactional';
import { ClassPackageService } from '../services/class-package.service';
import { CreateClassPackageDto } from '../dto/create-class-package.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { ClassPackage } from '../entities/class-package.entity';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ClassIdParamDto } from '../dto/class-id-param.dto';
import { PaginatePackagesDto } from '../dto/paginate-packages.dto';
import { Pagination } from '@/shared/common/types/pagination.types';

@ApiTags('Packages')
@ApiBearerAuth()
@Controller('packages')
export class PackagesController {
  constructor(private readonly classPackageService: ClassPackageService) {}

  @Get()
  @Permissions(PERMISSIONS.CLASSES.READ)
  @ApiOperation({
    summary: 'List packages with pagination',
    description: 'Get paginated list of packages with optional filtering.',
  })
  @ApiResponse({ status: 200, description: 'Packages retrieved successfully' })
  async listPackages(
    @Query() paginationDto: PaginatePackagesDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<Pagination<ClassPackage>>> {
    const result = await this.classPackageService.paginatePackages(paginationDto, actor);

    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.packages' },
    });
  }

  @Post()
  @Permissions(PERMISSIONS.CLASSES.CREATE)
  @ApiOperation({ summary: 'Create a new class package' })
  @ApiResponse({
    status: 201,
    description: 'Package created successfully',
  })
  async createPackage(
    @Body() dto: CreateClassPackageDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<ClassPackage>> {
    const result = await this.classPackageService.createPackage(dto, actor);

    return ControllerResponse.success(result, {
      key: 't.messages.created',
      args: { resource: 't.resources.package' },
    });
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CLASSES.READ)
  @ApiOperation({ summary: 'Get package by ID' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({
    status: 200,
    description: 'Package retrieved successfully',
  })
  async getPackage(
    @Param('id') id: string,
  ): Promise<ControllerResponse<ClassPackage>> {
    const result = await this.classPackageService.getPackage(id);

    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.package' },
    });
  }

  @Get()
  @Permissions(PERMISSIONS.CLASSES.READ)
  @ApiOperation({ summary: 'Get active packages for groups' })
  @ApiResponse({
    status: 200,
    description: 'Packages retrieved successfully',
  })
  async getPackagesForGroups(
    @Query('groupIds') groupIds: string[],
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<ClassPackage[]>> {
    if (!groupIds || groupIds.length === 0) {
      return ControllerResponse.success([], {
        key: 't.messages.found',
        args: { resource: 't.resources.packages' },
      });
    }

    const result = await this.classPackageService.getActivePackagesForClasses(groupIds);

    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.packages' },
    });
  }

  @Get('class/:classId')
  @Permissions(PERMISSIONS.CLASSES.READ)
  @ApiOperation({ summary: 'Get active packages for a specific class' })
  @ApiResponse({
    status: 200,
    description: 'Packages retrieved successfully',
  })
  async getPackagesForClass(
    @Param() params: ClassIdParamDto,
  ): Promise<ControllerResponse<ClassPackage[]>> {
    const result = await this.classPackageService.getActivePackagesForClass(params.classId);

    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.packages' },
    });
  }

  @Put(':id')
  @Permissions(PERMISSIONS.CLASSES.UPDATE)
  @ApiOperation({ summary: 'Update a package' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({
    status: 200,
    description: 'Package updated successfully',
  })
  async updatePackage(
    @Param('id') id: string,
    @Body() dto: Partial<CreateClassPackageDto>,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<ClassPackage>> {
    const result = await this.classPackageService.updatePackage(id, dto, actor);

    return ControllerResponse.success(result, {
      key: 't.messages.updated',
      args: { resource: 't.resources.package' },
    });
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CLASSES.DELETE)
  @ApiOperation({ summary: 'Delete a package (deactivate)' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({
    status: 200,
    description: 'Package deactivated successfully',
  })
  async deletePackage(
    @Param('id') id: string,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<void>> {
    await this.classPackageService.deletePackage(id, actor);

    return ControllerResponse.success(undefined, {
      key: 't.messages.deleted',
      args: { resource: 't.resources.package' },
    });
  }
}

