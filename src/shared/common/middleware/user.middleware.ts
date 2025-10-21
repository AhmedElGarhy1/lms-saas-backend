import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { decode, JwtPayload } from 'jsonwebtoken';
import { RequestContext } from '../context/request.context';
import { UserService } from '@/modules/user/services/user.service';
import { IRequest } from '../interfaces/request.interface';
import { Locale } from '@/shared/common/enums/locale.enum';

export class UserMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req: IRequest, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization as string;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      next();
      return;
    }
    const token = authorization.split(' ')[1];
    if (!token) {
      next();
      return;
    }
    const decoded = decode(token) as JwtPayload;
    if (!decoded) {
      next();
      return;
    }
    const user = await this.userService.findOne(decoded.sub as string);
    if (!user) {
      next();
      return;
    }
    RequestContext.run(
      {
        userId: decoded.sub,
        locale: (user.userInfo?.locale as Locale) || Locale.EN,
      },
      () => {
        next();
      },
    );
  }
}
