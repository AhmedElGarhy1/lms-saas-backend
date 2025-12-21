import { ActorUser } from '@/shared/common/types/actor-user.type';

/**
 * Base abstract class for intent resolvers
 * Provides common utilities shared across resolvers
 */
export abstract class BaseIntentResolver {
  /**
   * Format phone number with +2 prefix if not already formatted
   * Matches User.getPhone() behavior
   */
  protected formatPhone(phone: string): string {
    if (!phone) return '';
    return phone.startsWith('+') ? phone : `+2${phone}`;
  }

  /**
   * Extract phone from actor (handles both class instance and serialized object)
   */
  protected extractPhone(actor: ActorUser | { phone?: string; getPhone?: () => string }): string {
    if (typeof (actor as any).getPhone === 'function') {
      return (actor as ActorUser).getPhone();
    }
    return this.formatPhone((actor.phone as string | undefined) || '');
  }

  /**
   * Extract locale from actor/user info
   */
  protected extractLocale(
    actor: ActorUser | { userInfo?: { locale?: string } },
    fallback: string = 'en',
  ): string {
    return (actor.userInfo?.locale as string | undefined) || fallback;
  }
}

