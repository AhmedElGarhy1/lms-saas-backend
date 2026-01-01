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

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
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
    const request = context.switchToHttp().getRequest<Request>();
    // Only apply JWT validation to API routes
    if (!request.url.startsWith('/api')) {
      return true;
    }
    return super.canActivate(context);
  }

  // handleRequest(
  //   err: any,
  //   user: any,
  //   info: any,
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   _context: ExecutionContext,
  // ): any {
  //   if (err || !user) {
  //     // Log more details for debugging
  //     if (err) {
  //       const errorMessage = err instanceof Error ? err.message : String(err);
  //       const errorStack = err instanceof Error ? err.stack : undefined;
  //       this.logger.warn(
  //         `JWT authentication failed: ${errorMessage}`,
  //         errorStack,
  //       );
  //     }
  //     if (info) {
  //       this.logger.warn(`JWT info: ${JSON.stringify(info)}`);
  //     }

  //     // If err is already an HttpException (e.g., BusinessLogicException from phone verification),
  //     // preserve it so the actual error message is returned to the client
  //     if (err instanceof HttpException) {
  //       throw err;
  //     }

  //   }

  //   return user;
  // }
}
