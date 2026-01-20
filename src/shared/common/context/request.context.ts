// request-context.ts
import { Locale } from '@/shared/common/enums/locale.enum';
import { AsyncLocalStorage } from 'async_hooks';
import { ProfileType } from '../enums/profile-type.enum';

export interface IRequestContext {
  userId?: string;
  centerId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string; // Used as correlationId for request tracing
  correlationId?: string; // Explicit correlationId for notification tracing (alias of requestId)
  locale: Locale;
  userProfileType?: ProfileType;
  userProfileId?: string;
  timezone?: string; // Center timezone for date conversions
}

const asyncLocalStorage = new AsyncLocalStorage<IRequestContext>();

export class RequestContext {
  static run<T = void>(
    context: IRequestContext,
    callback: () => T | Promise<T>,
  ): T | Promise<T> {
    return asyncLocalStorage.run(context, callback);
  }

  static get(): IRequestContext {
    return (
      asyncLocalStorage.getStore() ?? {
        locale: Locale.AR,
      }
    );
  }

  static set(values: Partial<IRequestContext>) {
    const store = asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, values);
    }
  }
}
