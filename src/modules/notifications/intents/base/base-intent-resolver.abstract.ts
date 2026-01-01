import { User } from '@/modules/user/entities/user.entity';
import { ActorUser } from '@/shared/common/types/actor-user.type';

/**
 * Base abstract class for intent resolvers
 * Provides common utilities shared across resolvers
 */
export abstract class BaseIntentResolver {
  protected extractLocale(actor: ActorUser | User): string {
    return actor.userInfo?.locale || 'ar';
  }
}
