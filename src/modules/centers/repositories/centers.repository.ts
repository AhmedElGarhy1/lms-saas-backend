import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Center } from '../entities/center.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Pagination } from 'nestjs-typeorm-paginate';
import { LoggerService } from '../../../shared/services/logger.service';
import { CENTER_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { CenterResponseDto } from '../dto/center-response.dto';
import { PaginateCentersDto } from '../dto/paginate-centers.dto';
import { AccessibleUsersEnum } from '@/modules/user/dto/paginate-users.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class CentersRepository extends BaseRepository<Center> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof Center {
    return Center;
  }

  async findByName(name: string): Promise<Center | null> {
    return this.getRepository().findOne({ where: { name } });
  }

  async paginateCenters(
    params: PaginateCentersDto,
    actor: ActorUser,
  ): Promise<Pagination<CenterResponseDto>> {
    const { userProfileId, centerAccess } = params;
    const queryBuilder = this.getRepository().createQueryBuilder('center');
    this.applyIsActiveFilter(queryBuilder, params, 'center');

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );

    // Apply access control
    if (isSuperAdmin) {
      // no access control
    } else {
      queryBuilder.andWhere(
        'center.id IN (SELECT "centerId" FROM center_access WHERE "userProfileId" = :actorUserProfileId)',
        {
          actorUserProfileId: actor.userProfileId,
        },
      );
    }
    // subquery to to get accessible centers for params.userId
    if (
      userProfileId &&
      (!centerAccess || centerAccess === AccessibleUsersEnum.INCLUDE)
    ) {
      const isTargetUserSuperAdmin =
        await this.accessControlHelperService.isSuperAdmin(userProfileId);

      if (isTargetUserSuperAdmin) {
        // nothing
      } else {
        queryBuilder.andWhere(
          'center.id IN (SELECT "centerId" FROM center_access WHERE "userProfileId" = :userProfileId)',
          {
            userProfileId: userProfileId,
          },
        );
      }
    }

    const result = await this.paginate(
      params,
      CENTER_PAGINATION_COLUMNS,
      '/centers',
      queryBuilder,
    );

    let filteredItems: CenterResponseDto[] = result.items;

    if (userProfileId && centerAccess) {
      filteredItems = await this.applyCenterAccess(
        filteredItems,
        userProfileId,
        centerAccess,
      );
    }

    return {
      ...result,
      items: filteredItems,
    };
  }

  async updateCenter(
    centerId: string,
    updateData: Partial<Center>,
  ): Promise<Center | null> {
    await this.getRepository().update(centerId, updateData);
    return this.findOne(centerId);
  }

  async updateCenterActivation(
    centerId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.getRepository().update(centerId, { isActive });
  }

  // Seeder method
  async clearAllCenters(): Promise<void> {
    await this.getRepository().createQueryBuilder().delete().execute();
  }

  private async applyCenterAccess(
    centers: CenterResponseDto[],
    userProfileId: string,
    centerAccess: AccessibleUsersEnum,
  ): Promise<CenterResponseDto[]> {
    let filteredItems: CenterResponseDto[] = centers;
    const centerIds = centers.map((center) => center.id);
    if (centerAccess === AccessibleUsersEnum.ALL) {
      const accessibleCentersIds =
        await this.accessControlHelperService.getAccessibleCentersIdsForProfile(
          userProfileId,
          centerIds,
        );
      filteredItems = filteredItems.map((center) =>
        Object.assign(center, {
          isCenterAccessible: accessibleCentersIds.includes(center.id),
        }),
      );
    } else {
      filteredItems = filteredItems.map((center) =>
        Object.assign(center, {
          isCenterAccessible: true,
        }),
      );
    }
    return filteredItems;
  }
}
