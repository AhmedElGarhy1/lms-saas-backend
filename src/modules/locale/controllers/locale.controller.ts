import { Public } from '@/shared/common/decorators/public.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { LocaleService } from '../services/locale.service';
import { RequestContext } from '@/shared/common/context/request.context';

@ApiBearerAuth()
@ApiTags('Locale')
@Controller('locale')
@Public()
export class LocaleController {
  constructor(private readonly localeService: LocaleService) {}

  @Get()
  @ApiOperation({ summary: 'Get translations by language parameter' })
  @ApiResponse({
    status: 200,
    description: 'Translations retrieved successfully',
  })
  @ApiQuery({
    name: 'lang',
    description: 'Language code (if empty, returns user.locale language)',
    required: false,
  })
  getTranslations(@Query('lang') lang?: string) {
    const translations = this.localeService.getTranslations(lang);

    return translations;
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user locale preference' })
  @ApiResponse({
    status: 200,
    description: 'User locale retrieved successfully',
  })
  getUserLocale() {
    const userLocale = RequestContext.get().locale;

    return ControllerResponse.success(userLocale, 't.messages.found', {
      resource: 't.resources.locale',
    });
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get all available languages' })
  @ApiResponse({
    status: 200,
    description: 'Available languages retrieved successfully',
  })
  getAvailableLanguages() {
    const languages = this.localeService.getAvailableLanguages();
    return ControllerResponse.success(languages, 't.messages.found', {
      resource: 't.resources.language',
    });
  }
}
