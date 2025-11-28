import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { CenterAccess } from '../entities/center-access.entity';
import { CenterAccessDto } from '../dto/center-access.dto';
import {
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from '@/shared/common/exceptions/custom.exceptions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class CenterAccessRepository extends BaseRepository<CenterAccess> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof CenterAccess {
    return CenterAccess;
  }

  async findCenterAccess(
    data: CenterAccessDto,
    isDeleted?: boolean,
  ): Promise<CenterAccess | null> {
    if (isDeleted) {
      return this.findOneSoftDeleted(data);
    }
    return this.getRepository().findOneBy(data);
  }

  async grantCenterAccess(data: CenterAccessDto): Promise<CenterAccess> {
    // Check if access already exists
    const existingAccess = await this.findCenterAccess(data);
    if (existingAccess) {
      throw new ResourceAlreadyExistsException('t.errors.accessAlreadyExists');
    }

    return this.create(data);
  }

  async revokeCenterAccess(data: CenterAccessDto) {
    const existingAccess = await this.findCenterAccess(data, true);
    if (!existingAccess) {
      throw new ResourceNotFoundException('t.errors.accessNotFound');
    }

    return this.getRepository().remove(existingAccess);
  }

  async getProfileCenterAccess(userProfileId: string): Promise<CenterAccess[]> {
    return this.getRepository().find({
      where: { userProfileId },
      relations: ['center'],
    });
  }

  async getCenterProfileAccess(centerId: string): Promise<CenterAccess[]> {
    return this.getRepository().find({
      where: { centerId },
      relations: ['profile'],
    });
  }
}
