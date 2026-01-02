import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUser } from '@/shared/common/decorators/get-user.decorator';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { LocaleService } from '../services/locale.service';
import { Public } from '@/shared/common/decorators';
import { RequestContext } from '@/shared/common/context/request.context';

@ApiTags('Locale')
@Controller('locale')
export class LocaleController {
  constructor(private readonly localeService: LocaleService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user locale',
    description:
      "Returns the authenticated user's preferred locale with fallback to Arabic",
  })
  @ApiResponse({
    status: 200,
    description: 'User locale retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            locale: { type: 'string', example: 'ar' },
          },
        },
      },
    },
  })
  @Public()
  async getMyLocale(): Promise<ControllerResponse<string>> {
    const locale = await this.localeService.getUserLocale();
    return ControllerResponse.success(locale);
  }
}
