import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/roles/role.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '../../../shared/services/logger.service';
import { Pagination } from 'nestjs-typeorm-paginate';
import { AccessControlHelperService } from '../services/access-control-helper.service';
import { RoleResponseDto } from '../dto/role-response.dto';
import { PaginateRolesDto } from '../dto/paginate-roles.dto';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    protected readonly logger: LoggerService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(roleRepository, logger);
  }

  async paginateRoles(
    query: PaginateRolesDto,
    actorId: string,
  ): Promise<Pagination<RoleResponseDto>> {
    const { centerId, userId } = query;
    const queryBuilder = this.roleRepository.createQueryBuilder('role');

    // Apply center filter
    if (centerId) {
      queryBuilder.where('role.centerId = :centerId', { centerId });
    } else {
      queryBuilder
        .where('role.centerId IS NULL')
        .andWhere('role.type != :roleType', { roleType: RoleType.CENTER });
    }
    if (query.type) {
      queryBuilder.where('role.type = :type', { type: query.type });
    }

    const result = await this.paginate(
      query,
      {
        searchableColumns: ['name', 'description'],
        sortableColumns: ['name', 'description', 'createdAt'],
        defaultSortBy: ['name', 'ASC'],
      },
      '/roles',
      queryBuilder,
    );
    let filteredItems: RoleResponseDto[] = result.items;

    if (userId) {
      const accessibleRolesIds =
        await this.accessControlHelperService.getAccessibleRolesIdsForUser(
          userId,
          centerId,
        );
      filteredItems = filteredItems.map((role) =>
        Object.assign(role, {
          isUserAccessible: accessibleRolesIds.includes(role.id),
        }),
      );
    }
    return {
      ...result,
      items: filteredItems,
    };
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({ where: { name } });
  }
}
