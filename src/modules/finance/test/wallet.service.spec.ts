import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../services/wallet.service';
import { WalletRepository } from '../repositories/wallet.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { UserProfileRepository } from '@/modules/user-profile/repositories/user-profile.repository';
import { TransactionService } from '../services/transaction.service';
import { Wallet } from '../entities/wallet.entity';
import { WalletOwnerType } from '../enums/wallet-owner-type.enum';
import { Money } from '@/shared/common/utils/money.util';
import { DomainException } from '@/shared/common/exceptions/domain.exception';
import { FinanceErrorCode } from '../enums/finance.codes';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: jest.Mocked<WalletRepository>;
  let transactionRepository: jest.Mocked<TransactionRepository>;

  const mockWallet: Wallet = {
    id: 'wallet-123',
    ownerId: 'user-123',
    ownerType: WalletOwnerType.USER_PROFILE,
    balance: Money.from(100.0),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockWalletRepository = {
      findByOwner: jest.fn(),
      saveWallet: jest.fn(),
      findOneWithLock: jest.fn(),
    };

    const mockTransactionRepository = {
      getWalletStatement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: WalletRepository,
          useValue: mockWalletRepository,
        },
        {
          provide: TransactionRepository,
          useValue: mockTransactionRepository,
        },
        {
          provide: AccessControlHelperService,
          useValue: {},
        },
        {
          provide: UserProfileRepository,
          useValue: {},
        },
        {
          provide: TransactionService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get(WalletRepository);
    transactionRepository = module.get(TransactionRepository);
  });

  describe('getWallet', () => {
    it('should return existing wallet if found', async () => {
      walletRepository.findByOwner.mockResolvedValue(mockWallet);

      const result = await service.getWallet(
        'user-123',
        WalletOwnerType.USER_PROFILE,
      );

      expect(result).toEqual(mockWallet);
      expect(walletRepository.findByOwner).toHaveBeenCalledWith(
        'user-123',
        WalletOwnerType.USER_PROFILE,
      );
    });

    it('should create new wallet if not found', async () => {
      walletRepository.findByOwner.mockResolvedValue(null);
      walletRepository.saveWallet.mockResolvedValue(mockWallet);

      const result = await service.getWallet(
        'user-123',
        WalletOwnerType.USER_PROFILE,
      );

      expect(walletRepository.saveWallet).toHaveBeenCalled();
      expect(result.balance.equals(Money.zero())).toBe(true);
    });
  });

  describe('updateBalance', () => {
    it('should successfully update balance with positive amount', async () => {
      walletRepository.findOneWithLock.mockResolvedValue(mockWallet);
      walletRepository.saveWallet.mockResolvedValue({
        ...mockWallet,
        balance: Money.from(150.0), // 100 + 50
      });

      const result = await service.updateBalance(
        'wallet-123',
        Money.from(50.0),
      );

      expect(result.balance.equals(Money.from(150.0))).toBe(true);
    });

    it('should throw DomainException for negative balance', async () => {
      walletRepository.findOneWithLock.mockResolvedValue(mockWallet);

      await expect(
        service.updateBalance('wallet-123', Money.from(-150.0)),
      ).rejects.toThrow(DomainException);

      await expect(
        service.updateBalance('wallet-123', Money.from(-150.0)),
      ).rejects.toThrow(
        expect.objectContaining({
          errorCode: FinanceErrorCode.INSUFFICIENT_WALLET_BALANCE,
        }),
      );
    });
  });

  // TODO: Add more test cases for:
  // - updateLockedBalance
  // - moveFromLockedToBalance
  // - getWalletStatement
  // - Concurrency scenarios
  // - Lock timeout scenarios
  // - Integration tests
});
