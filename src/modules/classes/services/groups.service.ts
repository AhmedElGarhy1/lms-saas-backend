import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { PaginateGroupsDto } from '../dto/paginate-groups.dto';
import { GroupsRepository } from '../repositories/groups.repository';
import { ClassesRepository } from '../repositories/classes.repository';
import { ScheduleItemsRepository } from '../repositories/schedule-items.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';
import { GroupValidationService } from './group-validation.service';
import { Pagination } from 'nestjs-typeorm-paginate';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { Group } from '../entities/group.entity';
import { Class } from '../entities/class.entity';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import {
  GroupCreatedEvent,
  GroupUpdatedEvent,
  GroupDeletedEvent,
  GroupRestoredEvent,
} from '../events/group.events';

@Injectable()
export class GroupsService extends BaseService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly classesRepository: ClassesRepository,
    private readonly scheduleItemsRepository: ScheduleItemsRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
    private readonly groupValidationService: GroupValidationService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
  }

  async paginateGroups(
    paginateDto: PaginateGroupsDto,
    actor: ActorUser,
  ): Promise<Pagination<Group>> {
    return this.groupsRepository.paginateGroups(paginateDto, actor.centerId!);
  }

  async getGroup(groupId: string, actor: ActorUser): Promise<Group> {
    const group = await this.groupsRepository.findGroupWithRelations(groupId);

    if (!group) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.group',
        identifier: 'ID',
        value: groupId,
      });
    }

    if (group.centerId !== actor.centerId) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.group',
        identifier: 'ID',
        value: groupId,
      });
    }

    return group;
  }

  async createGroup(
    createGroupDto: CreateGroupDto,
    actor: ActorUser,
  ): Promise<Group> {
    // Validate group creation
    const classEntity = await this.groupValidationService.validateGroupCreation(
      createGroupDto,
      actor,
      actor.centerId!,
    );

    // Create group entity
    const group = await this.createGroupEntity(createGroupDto, classEntity);

    // Create schedule items
    await this.createScheduleItems(group.id, createGroupDto.scheduleItems);

    // Assign students
    await this.assignStudentsToGroup(
      group.id,
      createGroupDto.studentUserProfileIds,
    );

    // Load group with relations and emit event
    const createdGroup = await this.getGroup(group.id, actor);

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.CREATED,
      new GroupCreatedEvent(createdGroup, classEntity, actor, actor.centerId!),
    );

    return createdGroup;
  }

  private async createGroupEntity(
    dto: CreateGroupDto,
    classEntity: Class,
  ): Promise<Group> {
    return this.groupsRepository.create({
      classId: dto.classId,
      branchId: classEntity.branchId,
      centerId: classEntity.centerId,
      name: dto.name,
    });
  }

  private async createScheduleItems(
    groupId: string,
    scheduleItems: CreateGroupDto['scheduleItems'],
  ): Promise<void> {
    await this.scheduleItemsRepository.bulkCreate(groupId, scheduleItems);
  }

  private async assignStudentsToGroup(
    groupId: string,
    studentUserProfileIds: string[],
  ): Promise<void> {
    await this.groupStudentsRepository.bulkAssign(
      groupId,
      studentUserProfileIds,
    );
  }

  async updateGroup(
    groupId: string,
    data: UpdateGroupDto,
    actor: ActorUser,
  ): Promise<Group> {
    const group = await this.getGroup(groupId, actor);

    // Validate group update
    await this.groupValidationService.validateGroupUpdate(
      groupId,
      data,
      actor,
      actor.centerId!,
      group,
    );

    // Update name if provided
    if (data.name !== undefined) {
      await this.groupsRepository.update(groupId, { name: data.name });
    }

    // Update schedule items if provided
    if (data.scheduleItems) {
      await this.updateScheduleItems(groupId, data.scheduleItems);
    }

    // Update student assignments if provided
    if (data.studentUserProfileIds) {
      await this.updateStudentAssignments(groupId, data.studentUserProfileIds);
    }

    // Load updated group and emit event
    const updatedGroup = await this.getGroup(groupId, actor);

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.UPDATED,
      new GroupUpdatedEvent(updatedGroup, actor, actor.centerId!),
    );

    return updatedGroup;
  }

  private async updateScheduleItems(
    groupId: string,
    scheduleItems: UpdateGroupDto['scheduleItems'],
  ): Promise<void> {
    if (!scheduleItems) return;
    await this.scheduleItemsRepository.updateScheduleItems(
      groupId,
      scheduleItems,
    );
  }

  private async updateStudentAssignments(
    groupId: string,
    studentUserProfileIds: string[],
  ): Promise<void> {
    await this.groupStudentsRepository.bulkAssign(
      groupId,
      studentUserProfileIds,
    );
  }

  async deleteGroup(groupId: string, actor: ActorUser): Promise<void> {
    await this.getGroup(groupId, actor);
    await this.groupsRepository.softRemove(groupId);

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.DELETED,
      new GroupDeletedEvent(groupId, actor, actor.centerId!),
    );
  }

  async restoreGroup(groupId: string, actor: ActorUser): Promise<void> {
    const group = await this.groupsRepository.findOneSoftDeletedById(groupId);
    if (!group) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.group',
        identifier: 'ID',
        value: groupId,
      });
    }

    if (group.centerId !== actor.centerId) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.group',
        identifier: 'ID',
        value: groupId,
      });
    }

    await this.groupsRepository.restore(groupId);

    const restoredGroup = await this.groupsRepository.findOne(groupId);
    if (!restoredGroup) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.group',
        identifier: 'ID',
        value: groupId,
      });
    }

    await this.typeSafeEventEmitter.emitAsync(
      GroupEvents.RESTORED,
      new GroupRestoredEvent(restoredGroup, actor, actor.centerId),
    );
  }

  async addStudentsToGroup(
    groupId: string,
    studentUserProfileIds: string[],
    actor: ActorUser,
  ): Promise<void> {
    // Get existing students
    const existingStudents =
      await this.groupStudentsRepository.findByGroupId(groupId);
    const existingStudentIds = existingStudents.map(
      (gs) => gs.studentUserProfileId,
    );

    // Add new students (avoid duplicates)
    const newStudentIds = studentUserProfileIds.filter(
      (id) => !existingStudentIds.includes(id),
    );

    // Validate new students (with branch access)
    await this.groupValidationService.validateStudents(
      newStudentIds,
      actor.centerId!,
    );

    // Create new assignments
    for (const studentUserProfileId of newStudentIds) {
      await this.groupStudentsRepository.create({
        groupId,
        studentUserProfileId,
      });
    }
  }

  async removeStudentsFromGroup(
    groupId: string,
    studentUserProfileIds: string[],
    actor: ActorUser,
  ): Promise<void> {
    await this.getGroup(groupId, actor);

    // Remove students
    for (const studentUserProfileId of studentUserProfileIds) {
      const groupStudent =
        await this.groupStudentsRepository.findByGroupAndStudent(
          groupId,
          studentUserProfileId,
        );
      if (groupStudent) {
        await this.groupStudentsRepository.softRemove(groupStudent.id);
      }
    }
  }
}
