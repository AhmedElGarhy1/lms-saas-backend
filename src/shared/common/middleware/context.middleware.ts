// context.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from '../context/request.context';
import { IRequest } from '../interfaces/request.interface';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: IRequest, res: Response, next: NextFunction) {
    const user = req.user;
    const centerId = req.centerId;

    RequestContext.run({ userId: user?.id, centerId }, () => {
      next();
    });
  }
}
