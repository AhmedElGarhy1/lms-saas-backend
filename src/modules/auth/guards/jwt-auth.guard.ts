import {
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@/shared/common/decorators/public.decorator';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ExecutionContext,
  ): any {
    if (err || !user) {
      // Log more details for debugging
      if (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;
        this.logger.warn(
          `JWT authentication failed: ${errorMessage}`,
          errorStack,
        );
      }
      if (info) {
        this.logger.warn(`JWT info: ${JSON.stringify(info)}`);
      }

      // If err is already an HttpException (e.g., BusinessLogicException from phone verification),
      // preserve it so the actual error message is returned to the client
      if (err instanceof HttpException) {
        throw err;
      }

      // For other errors (token expired, invalid signature, etc.), use generic message
      throw new UnauthorizedException(
        this.i18n.translate('t.errors.invalidOrExpiredToken' as any),
      );
    }

    return user;
  }
}
