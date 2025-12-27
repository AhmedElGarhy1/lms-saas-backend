import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WalletService } from '../services/wallet.service';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { UserEvents } from '@/shared/events/user.events.enum';
import { UserCreatedEvent } from '@/modules/user/events/user.events';

/**
 * Listener for user profile creation events
 * Automatically creates wallets when user profiles are created
 */
@Injectable()
export class UserProfileListener {
  private readonly logger = new Logger(UserProfileListener.name);

  constructor(private readonly walletService: WalletService) {}

  /**
   * Handle user profile creation - create wallet for user profile
   * This handles all profile types: Staff, Student, Teacher, Admin
   */
  @OnEvent(UserEvents.CREATED)
  async handleUserProfileCreated(event: UserCreatedEvent) {
    try {
      const { profile } = event;
      await this.walletService.getWallet(
        profile.id,
        WalletOwnerType.USER_PROFILE,
      );
      this.logger.debug(
        `Wallet created for user profile: ${profile.id} (${profile.profileType})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create wallet for user profile ${event.profile.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Don't throw - wallet creation failure shouldn't break profile creation
    }
  }
}
