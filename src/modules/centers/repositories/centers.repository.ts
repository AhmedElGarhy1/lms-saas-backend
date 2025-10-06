import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from '../entities/center.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Pagination } from 'nestjs-typeorm-paginate';
import { LoggerService } from '../../../shared/services/logger.service';
import { CENTER_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { CenterResponseDto } from '../dto/center-response.dto';
import { PaginateCentersDto } from '../dto/paginate-centers.dto';

@Injectable()
export class CentersRepository extends BaseRepository<Center> {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
    protected readonly logger: LoggerService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(centerRepository, logger);
  }

  findByName(name: string): Promise<Center | null> {
    return this.centerRepository.findOne({ where: { name } });
  }

  async paginateCenters(
    params: PaginateCentersDto,
    actorId: string,
  ): Promise<Pagination<CenterResponseDto>> {
    const actorRole =
      await this.accessControlHelperService.getUserRole(actorId);
    const actorRoleType = actorRole?.role?.type;
    const queryBuilder = this.centerRepository.createQueryBuilder('center');

    // Apply access control
    if (actorRoleType === RoleType.SUPER_ADMIN) {
      // no access control
    } else {
      // TODO: make the condition using userRole
      queryBuilder.leftJoin('center.userRoles', 'userRoles');
      queryBuilder.andWhere('userRoles.userId = :actorId', {
        actorId,
      });
    }
    // subquery to to get accessible centers for params.userId
    if (params.userId) {
      queryBuilder.andWhere(
        'center.id IN (SELECT "centerId" FROM user_roles WHERE "userId" = :userId)',
        {
          userId: params.userId,
        },
      );
    }

    if (params.isActive !== undefined) {
      queryBuilder.andWhere('center.isActive = :isActive', {
        isActive: params.isActive,
      });
    }

    const result = await this.paginate(
      params,
      CENTER_PAGINATION_COLUMNS,
      '/centers',
      queryBuilder,
    );

    let filteredItems: CenterResponseDto[] = result.items;

    // if (params.userId) {
    //   const accessibleCentersIds =
    //     await this.accessControlHelperService.getAccessibleCentersIdsForUser(
    //       params.userId,
    //       result.items.map((center) => center.id),
    //     );
    //   filteredItems = filteredItems.map((center) =>
    //     Object.assign(center, {
    //       isCenterAccessible: accessibleCentersIds.includes(center.id),
    //     }),
    //   );
    // } else {
    //   filteredItems = filteredItems.map((center) =>
    //     Object.assign(center, {
    //       isCenterAccessible: false,
    //     }),
    //   );
    // }

    return {
      ...result,
      items: filteredItems,
    };
  }

  async updateCenter(
    centerId: string,
    updateData: Partial<Center>,
  ): Promise<Center | null> {
    await this.centerRepository.update(centerId, updateData);
    return this.findOne(centerId);
  }

  async updateCenterActivation(
    centerId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.centerRepository.update(centerId, { isActive });
  }

  // Seeder method
  async clearAllCenters(): Promise<void> {
    await this.centerRepository.createQueryBuilder().delete().execute();
  }
}
