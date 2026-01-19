import { Injectable } from '@nestjs/common';
import { Group } from '../entities/group.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateGroupsDto } from '../dto/paginate-groups.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { GroupStudent } from '../entities/group-student.entity';
import { ClassesErrors } from '../exceptions/classes.errors';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ClassStatus } from '../enums/class-status.enum';
import { GROUP_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';

export interface GroupWithStudentCount extends Group {
  studentsCount: number;
}

@Injectable()
export class GroupsRepository extends BaseRepository<Group> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    protected readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Group {
    return Group;
  }

  async paginateGroups(
    paginateDto: PaginateGroupsDto,
    actor: ActorUser,
  ): Promise<Pagination<GroupWithStudentCount>> {
    const centerId = actor.centerId!;
    const queryBuilder = this.getRepository()
      .createQueryBuilder('group')
      // Join relations for id and name fields only (not full entities)
      .leftJoin('group.class', 'class')
      .leftJoin('group.branch', 'branch')
      .leftJoin('group.center', 'center')
      // Load full scheduleItems
      .leftJoinAndSelect('group.scheduleItems', 'scheduleItems')
      // Add id and name fields as selections
      .addSelect([
        'class.id',
        'class.name',
        'class.duration',
        'branch.id',
        'branch.city',
        'center.id',
        'center.name',
      ])
      // Add student count subquery
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(groupStudentsForCount.id)', 'studentsCount')
            .from(GroupStudent, 'groupStudentsForCount')
            .where('groupStudentsForCount.groupId = group.id')
            .andWhere('groupStudentsForCount.leftAt IS NULL'),
        'studentsCount',
      )
      .where('group.centerId = :centerId', { centerId });

    // access control
    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );

    if (!canBypassCenterInternalAccess) {
      queryBuilder
        .leftJoin('class.classStaff', 'classStaff')
        .andWhere('classStaff.userProfileId = :userProfileId', {
          userProfileId: actor.userProfileId,
        });
    }

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

    if (paginateDto.activeClassesOnly) {
      queryBuilder.andWhere('class.status = :activeStatus', {
        activeStatus: ClassStatus.ACTIVE,
      });
    }

    return this.paginate(
      paginateDto,
      GROUP_PAGINATION_COLUMNS,
      'groups',
      queryBuilder,
      {
        includeComputedFields: true,
        computedFieldsMapper: (entity: Group, raw: any): Group => {
          // Map computed student count from raw data
          const studentsCount = parseInt(raw.studentsCount || '0', 10);

          // Return entity with computed field added
          return {
            ...entity,
            studentsCount,
          } as GroupWithStudentCount;
        },
      },
    ) as Promise<Pagination<GroupWithStudentCount>>;
  }

  async findGroupWithRelations(
    id: string,
    includeDeleted = false,
  ): Promise<GroupWithStudentCount | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('group')
      // Join relations for id and name fields only (not full entities)
      .leftJoin('group.class', 'class')
      .leftJoin('group.branch', 'branch')
      .leftJoin('group.center', 'center')
      // Load full scheduleItems
      .leftJoinAndSelect('group.scheduleItems', 'scheduleItems')
      // Add id and name fields as selections
      .addSelect([
        'class.id',
        'class.name',
        'class.duration',
        'branch.id',
        'branch.city',
        'center.id',
        'center.name',
      ])
      // Add student count subquery
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(groupStudentsForCount.id)', 'studentsCount')
            .from(GroupStudent, 'groupStudentsForCount')
            .where('groupStudentsForCount.groupId = group.id')
            .andWhere('groupStudentsForCount.leftAt IS NULL'),
        'studentsCount',
      )
      .where('group.id = :id', { id });

    if (!includeDeleted) {
      queryBuilder.andWhere('group.deletedAt IS NULL');
    } else {
      queryBuilder.withDeleted();
    }

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    if (!entities || entities.length === 0) {
      return null;
    }

    const entity = entities[0];
    const rawData = raw[0];

    // Map computed student count from raw data
    const studentsCount = parseInt(rawData.studentsCount || '0', 10);

    // Return entity with computed field added
    return {
      ...entity,
      studentsCount,
    } as GroupWithStudentCount;
  }

  /**
   * Find all groups for a given class ID.
   * Pure data access method - no business logic.
   *
   * @param classId - The class ID
   * @returns Array of groups
   */
  /**
   * Find all groups for a given class ID with schedule items loaded.
   * Repository decides which relations to load - service layer doesn't specify relations.
   * Pure data access method - no business logic.
   * Note: groupStudents are not loaded - fetch them separately using GroupStudentsRepository.
   *
   * @param classId - The class ID
   * @returns Array of groups with scheduleItems relation loaded
   */
  async findGroupsByClassIdWithScheduleAndStudents(
    classId: string,
  ): Promise<Group[]> {
    return this.getRepository().find({
      where: { classId },
      relations: ['scheduleItems'],
    });
  }

  /**
   * Find a group by ID with all relations loaded, throws if not found.
   * Pure data access method - no business logic.
   *
   * @param id - The group ID
   * @param includeDeleted - Whether to include soft-deleted groups
   * @returns Group with all relations
   * @throws ClassesErrors.groupNotFound() if group not found
   */
  async findGroupWithRelationsOrThrow(
    id: string,
    includeDeleted = false,
  ): Promise<GroupWithStudentCount> {
    const group = await this.findGroupWithRelations(id, includeDeleted);
    if (!group) {
      throw ClassesErrors.groupNotFound();
    }
    return group;
  }

  /**
   * Find all groups for a given class ID.
   * Pure data access method - no business logic.
   *
   * @param classId - The class ID
   * @returns Array of groups
   */
  async findByClassId(classId: string): Promise<Group[]> {
    return this.getRepository().find({
      where: { classId },
    });
  }

  async countActiveStudentsForCenter(centerId: string): Promise<number> {
    const result = await this.getRepository()
      .createQueryBuilder('group')
      .leftJoin('group.class', 'class')
      .leftJoin('group.groupStudents', 'groupStudent')
      .select('COUNT(DISTINCT groupStudent.studentUserProfileId)', 'count')
      .where('class.centerId = :centerId', { centerId })
      .andWhere('class.status = :status', { status: 'ACTIVE' })
      .andWhere('groupStudent.leftAt IS NULL')
      .getRawOne();

    return parseInt(result.count) || 0;
  }
}
