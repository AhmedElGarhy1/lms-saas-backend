import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StudentPackageService } from '../services/student-package.service';
import { PurchaseStudentPackageDto } from '../dto/purchase-student-package.dto';
import { PackageSummaryDto } from '../dto/package-summary.dto';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { StudentPackage } from '../entities/student-package.entity';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { GetUser } from '@/shared/common/decorators';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@ApiTags('Student Packages')
@ApiBearerAuth()
@Controller('student-packages')
export class StudentPackagesController {
  constructor(
    private readonly studentPackageService: StudentPackageService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get student package summary (aggregated by group)',
    description: 'Shows available credits for each class group the student has packages for',
  })
  @ApiResponse({
    status: 200,
    description: 'Package summary retrieved successfully',
  })
  async getPackageSummary(
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<PackageSummaryDto[]>> {
    const result = await this.studentPackageService.getStudentPackageSummary(
      actor.userProfileId,
    );

    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.packageSummary' },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get student active packages' })
  @ApiResponse({
    status: 200,
    description: 'Student packages retrieved successfully',
  })
  async getStudentPackages(
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<StudentPackage[]>> {
    const result = await this.studentPackageService.getStudentActivePackages(
      actor.userProfileId,
    );

    return ControllerResponse.success(result, {
      key: 't.messages.found',
      args: { resource: 't.resources.packages' },
    });
  }

  @Post('purchase')
  @Permissions(PERMISSIONS.STAFF.CREATE) // Admin/staff permission to purchase packages
  @ApiOperation({ summary: 'Purchase a package for a student' })
  @ApiResponse({
    status: 201,
    description: 'Package purchased successfully',
  })
  async purchasePackage(
    @Body() dto: PurchaseStudentPackageDto,
    @GetUser() actor: ActorUser,
  ): Promise<ControllerResponse<StudentPackage>> {
    const result = await this.studentPackageService.purchasePackage(dto, actor);

    return ControllerResponse.success(result, {
      key: 't.messages.created',
      args: { resource: 't.resources.studentPackage' },
    });
  }
}

