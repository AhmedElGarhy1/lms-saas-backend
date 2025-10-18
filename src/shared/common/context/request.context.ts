// request-context.ts
import { Locale } from '@/shared/common/enums/locale.enum';
import { AsyncLocalStorage } from 'async_hooks';

export interface IRequestContext {
  userId?: string;
  centerId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  locale?: Locale;
}

const asyncLocalStorage = new AsyncLocalStorage<IRequestContext>();

export class RequestContext {
  static run(context: IRequestContext, callback: () => void) {
    return asyncLocalStorage.run(context, callback);
  }

  static get(): IRequestContext {
    return asyncLocalStorage.getStore() ?? {};
  }

  static set(values: Partial<IRequestContext>) {
    const store = asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, values);
    }
  }
}
