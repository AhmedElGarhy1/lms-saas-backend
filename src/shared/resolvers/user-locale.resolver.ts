import { Injectable } from '@nestjs/common';
import { I18nResolver } from 'nestjs-i18n';
import { Request } from 'express';

@Injectable()
export class UserLocaleResolver implements I18nResolver {
  resolve(context: any): string | Promise<string> {
    const request = context.switchToHttp().getRequest() as Request;

    if (!request || !request.user) {
      return 'en'; // Default to English if no user
    }

    // Get user locale from the request user object
    const user = request.user as any;
    return user.locale || 'en';
  }
}
