import {
  Controller,
  Put,
  Body,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateApiResponses } from '@/shared/common/decorators';
import { SerializeOptions } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { UserService } from '../services/user.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { NoProfile } from '@/shared/common/decorators/no-profile.decorator';
import { Public } from '@/shared/common/decorators/public.decorator';
import { FileService } from '@/modules/file/services/file.service';
import { AvatarFileValidator } from '@/modules/file/validators/avatar-file.validator';
import { ImageDimensionsValidator } from '@/modules/file/validators/image-dimensions.validator';
import { createFileValidationException } from '@/modules/file/exceptions/file.errors';
import { NoContext } from '@/shared/common/decorators/no-context';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly fileService: FileService,
  ) {}

  @Put('me')
  @UpdateApiResponses('Update current user information')
  @ApiBody({ type: UpdateUserDto })
  @SerializeOptions({ type: UserResponseDto })
  @NoProfile()
  @Transactional()
  async updateCurrentUser(
    @Body() dto: UpdateUserDto,
    @GetUser() actor: ActorUser,
  ) {
    const user = await this.userService.updateUser(actor.id, dto, actor);

    return ControllerResponse.success(user);
  }

  @Post('me/avatar')
  @ApiOperation({
    summary: 'Upload or update user avatar',
    description: 'Upload a new avatar image for the current user',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image file',
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPEG, PNG, etc.)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              description: 'Updated user object with avatar File entity',
            },
            avatarUrl: {
              type: 'string',
              description: 'Direct public URL for the uploaded avatar',
            },
            fileId: { type: 'string', description: 'File entity ID' },
          },
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar'))
  @NoContext()
  @Transactional()
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new AvatarFileValidator({
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: [
              'image/jpeg',
              'image/png',
              'image/webp',
              'image/gif',
            ],
          }),
          new ImageDimensionsValidator({
            minWidth: 50,
            minHeight: 50,
            maxWidth: 4000,
            maxHeight: 4000,
          }),
        ],
        fileIsRequired: true,
        exceptionFactory: createFileValidationException,
      }),
    )
    file: Express.Multer.File,
    @GetUser() actor: ActorUser,
  ) {
    // Upload file and create File record
    const fileRecord = await this.fileService.uploadFile(file, {
      entityType: 'user',
      entityId: actor.id,
      fileType: 'avatar',
      description: 'User avatar',
    });

    // Update user's avatar reference
    const user = await this.userService.updateUserAvatar(
      actor.id,
      fileRecord.id,
    );

    // Get URL for immediate access (avatars are public)
    let avatarUrl: string | undefined;
    if (user.avatarFileId) {
      const file = await this.fileService.getFileById(user.avatarFileId);
      avatarUrl = await this.fileService.getFileUrl(file, true);
    }

    return ControllerResponse.success({
      user, // User with avatar File entity
      avatarUrl, // Direct public URL for avatar
      fileId: fileRecord.id,
    });
  }
}
