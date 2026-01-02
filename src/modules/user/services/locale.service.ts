import { Injectable } from '@nestjs/common';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { UserRepository } from '../repositories/user.repository';
import { RequestContext } from '@/shared/common/context/request.context';

@Injectable()
export class LocaleService {
  private readonly FALLBACK_LOCALE = 'ar';

  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Get the authenticated user's locale with fallback to Arabic
   * @param actor - The authenticated user
   * @returns User's locale or fallback
   */
  async getUserLocale(): Promise<string> {
    const userId = RequestContext.get().userId;
    if (!userId) {
      return this.FALLBACK_LOCALE;
    }
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      return this.FALLBACK_LOCALE;
    }
    return user.userInfo?.locale ?? this.FALLBACK_LOCALE;
  }
}
