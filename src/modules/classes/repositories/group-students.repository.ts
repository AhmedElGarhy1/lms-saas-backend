import { Injectable } from '@nestjs/common';
import { GroupStudent } from '../entities/group-student.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class GroupStudentsRepository extends BaseRepository<GroupStudent> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof GroupStudent {
    return GroupStudent;
  }

  async findByGroupId(groupId: string): Promise<GroupStudent[]> {
    return this.getRepository().find({
      where: { groupId },
      relations: ['student'],
    });
  }

  async bulkAssign(
    groupId: string,
    studentUserProfileIds: string[],
  ): Promise<GroupStudent[]> {
    // Delete existing assignments
    await this.getRepository().delete({ groupId });

    // Create new assignments
    const groupStudents = studentUserProfileIds.map((studentUserProfileId) =>
      this.getRepository().create({
        groupId,
        studentUserProfileId,
      }),
    );
    return this.getRepository().save(groupStudents);
  }

  async isStudentInGroup(
    groupId: string,
    studentUserProfileId: string,
  ): Promise<boolean> {
    const exists = await this.getRepository().exists({
      where: { groupId, studentUserProfileId },
    });
    return exists;
  }

  async findByGroupAndStudent(
    groupId: string,
    studentUserProfileId: string,
  ): Promise<GroupStudent | null> {
    return this.getRepository().findOne({
      where: { groupId, studentUserProfileId },
    });
  }
}
