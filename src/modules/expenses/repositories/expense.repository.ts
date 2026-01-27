import { Injectable } from '@nestjs/common';
import { Expense } from '../entities/expense.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaginateExpenseDto } from '../dto/paginate-expense.dto';
import { EXPENSE_PAGINATION_COLUMNS } from '@/shared/common/constants';
import { ExpensesErrors } from '../exceptions/expenses.errors';

@Injectable()
export class ExpenseRepository extends BaseRepository<Expense> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Expense {
    return Expense;
  }

  /**
   * Find an expense by ID optimized for API responses.
   * Selects only necessary fields (id, name, etc.) from relations for serialization.
   * Use this method when returning data to API clients to minimize response size.
   *
   * @param id - Expense ID
   * @param includeDeleted - Whether to include soft-deleted expenses
   * @returns Expense with selective relation fields, or null if not found
   */
  async findExpenseForResponse(
    id: string,
    includeDeleted: boolean = false,
  ): Promise<Expense | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('expense')
      // Join relations for id and name fields only (not full entities)
      .leftJoin('expense.center', 'center')
      .leftJoin('expense.branch', 'branch')
      .leftJoinAndSelect('expense.payment', 'payment')
      // Audit relations (creator, updater)
      .leftJoin('expense.creator', 'creator')
      .leftJoin('creator.user', 'creatorUser')
      .leftJoin('expense.updater', 'updater')
      .leftJoin('updater.user', 'updaterUser')
      // Add id and name fields as selections
      .addSelect([
        'center.id',
        'center.name',
        'branch.id',
        'branch.city',
        // Audit fields
        'creator.id',
        'creatorUser.id',
        'creatorUser.name',
        'updater.id',
        'updaterUser.id',
        'updaterUser.name',
      ])
      .where('expense.id = :id', { id });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find an expense by ID optimized for API responses, throws if not found.
   * Selects only necessary fields (id, name, etc.) from relations for serialization.
   * Use this method when returning data to API clients to minimize response size.
   *
   * @param id - Expense ID
   * @param includeDeleted - Whether to include soft-deleted expenses
   * @returns Expense with selective relation fields
   * @throws Error if expense not found
   */
  async findExpenseForResponseOrThrow(
    id: string,
    includeDeleted: boolean = false,
  ): Promise<Expense> {
    const expense = await this.findExpenseForResponse(id, includeDeleted);
    if (!expense) {
      throw ExpensesErrors.expenseNotFound();
    }
    return expense;
  }

  /**
   * Find an expense by ID with full relations loaded for internal use.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param id - Expense ID
   * @param includeDeleted - Whether to include soft-deleted expenses
   * @returns Expense with full relations loaded, or null if not found
   */
  async findExpenseWithFullRelations(
    id: string,
    includeDeleted: boolean = false,
  ): Promise<Expense | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('expense')
      // Load FULL entities using leftJoinAndSelect for all relations
      .leftJoinAndSelect('expense.center', 'center')
      .leftJoinAndSelect('expense.branch', 'branch')
      .leftJoinAndSelect('expense.payment', 'payment')
      .where('expense.id = :id', { id });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find an expense by ID with full relations loaded for internal use, throws if not found.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param id - Expense ID
   * @param includeDeleted - Whether to include soft-deleted expenses
   * @returns Expense with full relations loaded
   * @throws Error if expense not found
   */
  async findExpenseWithFullRelationsOrThrow(
    id: string,
    includeDeleted: boolean = false,
  ): Promise<Expense> {
    const expense = await this.findExpenseWithFullRelations(id, includeDeleted);
    if (!expense) {
      throw ExpensesErrors.expenseNotFound();
    }
    return expense;
  }

  /**
   * Find expense by ID or throw
   * @deprecated Use findExpenseForResponseOrThrow instead
   */
  async findOneOrThrow(id: string): Promise<Expense> {
    return this.findExpenseForResponseOrThrow(id);
  }

  /**
   * Paginate expenses with filtering and access control
   */
  async findExpensesPaginated(
    dto: PaginateExpenseDto,
    actor: ActorUser,
  ): Promise<Pagination<Expense>> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('expense')
      // Join relations for id and name fields only (not full entities)
      .leftJoin('expense.center', 'center')
      .leftJoin('expense.branch', 'branch')
      // Add id and name fields as selections
      .addSelect(['center.id', 'center.name', 'branch.id', 'branch.city'])
      // Filter out expenses where related entities are deleted (check if entity exists)
      .andWhere('center.id IS NOT NULL')
      .andWhere('branch.id IS NOT NULL');

    // Apply access control
    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );

    if (!isSuperAdmin) {
      // Filter by center access
      queryBuilder.andWhere(
        'expense.centerId IN (SELECT "centerId" FROM center_access WHERE "userProfileId" = :actorUserProfileId AND "isActive" = true AND "deletedAt" IS NULL)',
        {
          actorUserProfileId: actor.userProfileId,
        },
      );

      // If branchId is specified, check branch access
      if (dto.branchId) {
        const canBypassBranchAccess =
          await this.accessControlHelperService.bypassCenterInternalAccess(
            actor.userProfileId,
            dto.centerId || actor.centerId || '',
          );

        if (!canBypassBranchAccess) {
          queryBuilder.andWhere(
            'expense.branchId IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :actorUserProfileId)',
            {
              actorUserProfileId: actor.userProfileId,
            },
          );
        }
      }
    }

    // Apply filters
    if (dto.centerId) {
      queryBuilder.andWhere('expense.centerId = :centerId', {
        centerId: dto.centerId,
      });
    }

    if (dto.branchId) {
      queryBuilder.andWhere('expense.branchId = :branchId', {
        branchId: dto.branchId,
      });
    }

    if (dto.status) {
      queryBuilder.andWhere('expense.status = :status', { status: dto.status });
    }

    if (dto.category) {
      queryBuilder.andWhere('expense.category = :category', {
        category: dto.category,
      });
    }

    // Apply date filters
    if (dto.dateFrom) {
      queryBuilder.andWhere('expense.createdAt >= :dateFrom', {
        dateFrom: dto.dateFrom,
      });
    }

    if (dto.dateTo) {
      queryBuilder.andWhere('expense.createdAt <= :dateTo', {
        dateTo: dto.dateTo,
      });
    }

    // Apply search
    if (dto.search) {
      queryBuilder.andWhere(
        '(expense.title ILIKE :search OR expense.description ILIKE :search)',
        {
          search: `%${dto.search}%`,
        },
      );
    }

    // Default sort
    queryBuilder.orderBy('expense.createdAt', 'DESC');

    // Use base repository paginate method
    return this.paginate(
      dto,
      EXPENSE_PAGINATION_COLUMNS,
      '/expenses',
      queryBuilder,
    );
  }

  /**
   * Find expense by idempotency key
   * Used to prevent duplicate expense creation on retries
   */
  async findByIdempotencyKey(idempotencyKey: string): Promise<Expense | null> {
    return this.getRepository().findOne({
      where: { idempotencyKey },
    });
  }
}
