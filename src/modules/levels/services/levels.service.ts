import { Injectable } from '@nestjs/common';
import { CreateLevelDto } from '../dto/create-level.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';
import { PaginateLevelsDto } from '../dto/paginate-levels.dto';
import { LevelsRepository } from '../repositories/levels.repository';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class LevelsService extends BaseService {
  constructor(
    private readonly levelsRepository: LevelsRepository,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super();
  }

  async paginateLevels(
    paginateDto: PaginateLevelsDto,
    actor: ActorUser,
  ): Promise<Pagination<any>> {
    return this.levelsRepository.paginateLevels(paginateDto, actor.centerId!);
  }

  async getLevel(levelId: string, actor: ActorUser) {
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
    });

    const level = await this.levelsRepository.findOne(levelId);

    if (!level) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.level',
        identifier: 't.resources.identifier',
        value: levelId,
      });
    }

    if (level.centerId !== actor.centerId) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.level',
        identifier: 't.resources.identifier',
        value: levelId,
      });
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
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
    });

    await this.getLevel(levelId, actor);

    const updatedLevel = await this.levelsRepository.update(levelId, data);

    return updatedLevel;
  }

  async deleteLevel(levelId: string, actor: ActorUser) {
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
    });

    await this.getLevel(levelId, actor);
    await this.levelsRepository.softRemove(levelId);
  }

  async restoreLevel(levelId: string, actor: ActorUser): Promise<void> {
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
    });

    const level = await this.levelsRepository.findOneSoftDeletedById(levelId);
    if (!level) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.level',
        identifier: 't.resources.identifier',
        value: levelId,
      });
    }

    if (level.centerId !== actor.centerId) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.level',
        identifier: 't.resources.identifier',
        value: levelId,
      });
    }

    await this.levelsRepository.restore(levelId);
  }
}
