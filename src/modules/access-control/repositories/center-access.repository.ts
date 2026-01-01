import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { CenterAccess } from '../entities/center-access.entity';
import { CenterAccessDto } from '../dto/center-access.dto';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { In } from 'typeorm';

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
    // Database unique constraint will handle uniqueness
    return this.create(data);
  }

  async revokeCenterAccess(data: CenterAccessDto) {
    const existingAccess = await this.findCenterAccess(data, true);
    if (!existingAccess) {
      throw new ResourceNotFoundException("Operation failed");
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

  /**
   * Batch load center access records for multiple user profiles.
   * Excludes soft-deleted records.
   *
   * @param userProfileIds - Array of user profile IDs
   * @param centerId - Optional center ID to filter by
   * @returns Array of CenterAccess records
   */
  async findManyCenterAccess(
    userProfileIds: string[],
    centerId?: string,
  ): Promise<CenterAccess[]> {
    if (userProfileIds.length === 0) {
      return [];
    }
    return this.getRepository().find({
      where: {
        userProfileId: In(userProfileIds),
        ...(centerId && { centerId }),
      },
    });
  }
}
