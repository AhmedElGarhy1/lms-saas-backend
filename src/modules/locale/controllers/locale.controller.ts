import { Public } from '@/shared/common/decorators/public.decorator';
import { Controller, Get, Query, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { LocaleService } from '../services/locale.service';
import { RequestContext } from '@/shared/common/context/request.context';
import { Locale } from '@/shared/common/enums/locale.enum';

@ApiBearerAuth()
@ApiTags('Locale')
@Controller('locale')
@Public()
export class LocaleController {
  constructor(
    private readonly localeService: LocaleService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

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

    return ControllerResponse.success(
      userLocale,
      this.i18n.translate('api.success.dataRetrieved'),
    );
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get all available languages' })
  @ApiResponse({
    status: 200,
    description: 'Available languages retrieved successfully',
  })
  getAvailableLanguages() {
    const languages = this.localeService.getAvailableLanguages();
    return ControllerResponse.success(
      languages,
      this.i18n.translate('api.success.dataRetrieved'),
    );
  }
}
