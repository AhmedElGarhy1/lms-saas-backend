import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WalletService } from '../services/wallet.service';
import { CashboxService } from '../services/cashbox.service';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { BranchEvents } from '@/shared/events/branch.events.enum';
import { BranchCreatedEvent } from '@/modules/centers/events/branch.events';

/**
 * Listener for branch creation events
 * Automatically creates cashbox and wallet when branches are created
 */
@Injectable()
export class BranchListener {
  private readonly logger = new Logger(BranchListener.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly cashboxService: CashboxService,
  ) {}

  /**
   * Handle branch creation - create cashbox and wallet for branch
   */
  @OnEvent(BranchEvents.CREATED)
  async handleBranchCreated(event: BranchCreatedEvent) {
    try {
      const { branch } = event;

      // Create cashbox for the branch
      await this.cashboxService.getCashbox(branch.id);
      this.logger.debug(`Cashbox created for branch: ${branch.id}`);

      // Create wallet for the branch
      await this.walletService.getWallet(branch.id, WalletOwnerType.BRANCH);
      this.logger.debug(`Wallet created for branch: ${branch.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to create cashbox/wallet for branch ${event.branch.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Don't throw - finance entity creation failure shouldn't break branch creation
    }
  }
}
