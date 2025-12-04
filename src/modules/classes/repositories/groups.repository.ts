import { Injectable } from '@nestjs/common';
import { Group } from '../entities/group.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateGroupsDto } from '../dto/paginate-groups.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class GroupsRepository extends BaseRepository<Group> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Group {
    return Group;
  }

  async paginateGroups(
    paginateDto: PaginateGroupsDto,
    centerId: string,
  ): Promise<Pagination<Group>> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.class', 'class')
      .leftJoinAndSelect('group.scheduleItems', 'scheduleItems')
      .leftJoinAndSelect('group.groupStudents', 'groupStudents')
      .leftJoinAndSelect('groupStudents.student', 'student')
      .where('group.centerId = :centerId', { centerId });

    if (paginateDto.classId) {
      queryBuilder.andWhere('group.classId = :classId', {
        classId: paginateDto.classId,
      });
    }

    if (paginateDto.branchId) {
      queryBuilder.andWhere('group.branchId = :branchId', {
        branchId: paginateDto.branchId,
      });
    }

    return this.paginate(
      paginateDto,
      {
        searchableColumns: ['name'],
        sortableColumns: ['name', 'createdAt', 'updatedAt'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      'groups',
      queryBuilder,
    );
  }

  async findGroupWithRelations(id: string): Promise<Group | null> {
    return this.getRepository().findOne({
      where: { id },
      relations: [
        'class',
        'scheduleItems',
        'groupStudents',
        'groupStudents.student',
        'branch',
        'center',
      ],
    });
  }
}
