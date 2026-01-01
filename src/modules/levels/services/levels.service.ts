import { Injectable } from '@nestjs/common';
import { CreateLevelDto } from '../dto/create-level.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';
import { PaginateLevelsDto } from '../dto/paginate-levels.dto';
import { LevelsRepository } from '../repositories/levels.repository';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class LevelsService extends BaseService {
  constructor(private readonly levelsRepository: LevelsRepository) {
    super();
  }

  async paginateLevels(
    paginateDto: PaginateLevelsDto,
    actor: ActorUser,
  ): Promise<Pagination<any>> {
    return this.levelsRepository.paginateLevels(paginateDto, actor.centerId!);
  }

  async getLevel(levelId: string, actor: ActorUser, includeDeleted = false) {
    const level = includeDeleted
      ? await this.levelsRepository.findOneSoftDeletedById(levelId)
      : await this.levelsRepository.findOne(levelId);

    if (!level) {
      throw new ResourceNotFoundException("Operation failed");
    }

    return level;
  }

  async createLevel(createLevelDto: CreateLevelDto, actor: ActorUser) {
    const level = await this.levelsRepository.create({
      ...createLevelDto,
      centerId: actor.centerId!,
    });

    return level;
  }

  async updateLevel(levelId: string, data: UpdateLevelDto, actor: ActorUser) {
    await this.getLevel(levelId, actor);

    const updatedLevel = await this.levelsRepository.update(levelId, data);

    return updatedLevel;
  }

  async deleteLevel(levelId: string, actor: ActorUser) {
    await this.getLevel(levelId, actor);
    await this.levelsRepository.softRemove(levelId);
  }

  async restoreLevel(levelId: string, actor: ActorUser): Promise<void> {
    const level = await this.levelsRepository.findOneSoftDeletedById(levelId);
    if (!level) {
      throw new ResourceNotFoundException("Operation failed");
    }

    await this.levelsRepository.restore(levelId);
  }
}
