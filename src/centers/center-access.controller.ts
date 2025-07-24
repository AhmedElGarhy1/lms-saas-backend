import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CenterAccessService } from './center-access.service';
import {
  GrantCenterAccessRequestDto,
  GrantCenterAccessRequestSchema,
} from './dto/grant-center-access.dto';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { CurrentUser as CurrentUserType } from '../shared/types/current-user.type';
import { ContextGuard } from '../access-control/guards/context.guard';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { Permissions } from '../access-control/decorators/permissions.decorator';
import { ZodValidationPipe } from '../shared/utils/zod-validation.pipe';

@UseGuards(ContextGuard, PermissionsGuard)
@ApiTags('Center Access Management')
@Controller('centers/:centerId/access')
export class CenterAccessController {
  constructor(private readonly centerAccessService: CenterAccessService) {}

  @Permissions('center:manage-members')
  @Post('grant')
  @ApiOperation({ summary: 'Grant center access to a user' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiBody({ type: GrantCenterAccessRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Center access granted successfully',
  })
  async grantAccess(
    @Param('centerId') centerId: string,
    @Body(new ZodValidationPipe(GrantCenterAccessRequestSchema))
    dto: GrantCenterAccessRequestDto,
    @GetUser() user: CurrentUserType,
  ) {
    return this.centerAccessService.grantCenterAccess(centerId, dto, user.id);
  }

  @Permissions('center:manage-members')
  @Delete('revoke/:userId')
  @ApiOperation({ summary: 'Revoke center access from a user' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiParam({ name: 'userId', description: 'User ID to revoke access from' })
  @ApiResponse({
    status: 200,
    description: 'Center access revoked successfully',
  })
  async revokeAccess(
    @Param('centerId') centerId: string,
    @Param('userId') userId: string,
    @GetUser() user: CurrentUserType,
  ) {
    return this.centerAccessService.revokeCenterAccess(
      centerId,
      userId,
      user.id,
    );
  }

  @Permissions('center:view')
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user center access details' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User center access details retrieved successfully',
  })
  async getUserAccess(
    @Param('centerId') centerId: string,
    @Param('userId') userId: string,
  ) {
    return this.centerAccessService.getUserCenterAccess(centerId, userId);
  }

  @Permissions('center:view')
  @Get('users')
  @ApiOperation({ summary: 'List all users with access to this center' })
  @ApiParam({ name: 'centerId', description: 'Center ID' })
  @ApiResponse({
    status: 200,
    description: 'Center users list retrieved successfully',
  })
  async listCenterUsers(@Param('centerId') centerId: string) {
    return this.centerAccessService.listCenterUsers(centerId);
  }
}
