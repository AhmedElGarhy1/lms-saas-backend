import { Injectable } from '@nestjs/common';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { PaginateSubjectsDto } from '../dto/paginate-subjects.dto';
import { SubjectsRepository } from '../repositories/subjects.repository';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class SubjectsService extends BaseService {
  constructor(private readonly subjectsRepository: SubjectsRepository) {
    super();
  }

  async paginateSubjects(
    paginateDto: PaginateSubjectsDto,
    actor: ActorUser,
  ): Promise<Pagination<any>> {
    return this.subjectsRepository.paginateSubjects(
      paginateDto,
      actor.centerId!,
    );
  }

  async getSubject(
    subjectId: string,
    actor: ActorUser,
    includeDeleted = false,
  ) {
    const subject = includeDeleted
      ? await this.subjectsRepository.findOneSoftDeletedById(subjectId)
      : await this.subjectsRepository.findOne(subjectId);

    if (!subject) {
      throw new ResourceNotFoundException("Operation failed");
    }

    return subject;
  }

  async createSubject(createSubjectDto: CreateSubjectDto, actor: ActorUser) {
    const subject = await this.subjectsRepository.create({
      ...createSubjectDto,
      centerId: actor.centerId!,
    });

    return subject;
  }

  async updateSubject(
    subjectId: string,
    data: UpdateSubjectDto,
    actor: ActorUser,
  ) {
    await this.getSubject(subjectId, actor);

    const updatedSubject = await this.subjectsRepository.update(
      subjectId,
      data,
    );

    return updatedSubject;
  }

  async deleteSubject(subjectId: string, actor: ActorUser) {
    await this.getSubject(subjectId, actor);
    await this.subjectsRepository.softRemove(subjectId);
  }

  async restoreSubject(subjectId: string, actor: ActorUser): Promise<void> {
    const subject =
      await this.subjectsRepository.findOneSoftDeletedById(subjectId);
    if (!subject) {
      throw new ResourceNotFoundException("Operation failed");
    }

    await this.subjectsRepository.restore(subjectId);
  }
}
