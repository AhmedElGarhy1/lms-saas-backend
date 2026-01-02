import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { UserAccess } from '../entities/user-access.entity';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { AccessControlErrors } from '../exceptions/access-control.errors';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { In } from 'typeorm';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@Injectable()
export class UserAccessRepository extends BaseRepository<UserAccess> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof UserAccess {
    return UserAccess;
  }

  async findUserAccess(data: UserAccessDto) {
    return this.getRepository().findOneBy({
      granterUserProfileId: data.granterUserProfileId,
      targetUserProfileId: data.targetUserProfileId,
      ...(data.centerId && { centerId: data.centerId }),
    });
  }

  async grantUserAccess(body: UserAccessDto): Promise<void> {
    const userAccess = this.getRepository().create({
      granterUserProfileId: body.granterUserProfileId,
      targetUserProfileId: body.targetUserProfileId,
      ...(body.centerId && { centerId: body.centerId }),
    });
    await this.getRepository().save(userAccess);
  }

  async revokeUserAccess(body: UserAccessDto): Promise<void> {
    const userAccess = await this.getRepository().findOne({
      where: {
        granterUserProfileId: body.granterUserProfileId,
        targetUserProfileId: body.targetUserProfileId,
        ...(body.centerId && { centerId: body.centerId }),
      },
    });
    if (!userAccess) throw AccessControlErrors.userAccessNotFound();
    await this.getRepository().remove(userAccess);
  }

  async listUserAccesses(userProfileId: string): Promise<UserAccess[]> {
    return this.getRepository().find({
      where: { granterUserProfileId: userProfileId },
    });
  }

  /**
   * Batch load user access records.
   * Loads all user access records for a granter to multiple targets in one query.
   *
   * @param granterUserProfileId - The granter user profile ID
   * @param targetUserProfileIds - Array of target user profile IDs
   * @param centerId - Optional center ID to filter by
   * @param profileType - Optional profile type to filter target profiles
   * @returns Array of UserAccess records
   */
  async findManyUserAccess(
    granterUserProfileId: string,
    targetUserProfileIds: string[],
    centerId?: string,
    profileType?: ProfileType,
  ) {
    if (targetUserProfileIds.length === 0) {
      return [];
    }

    if (profileType) {
      // Use query builder to join with user_profiles via relation and filter by profileType
      return this.getRepository()
        .createQueryBuilder('userAccess')
        .innerJoin('userAccess.target', 'targetProfile')
        .where('userAccess.granterUserProfileId = :granterUserProfileId', {
          granterUserProfileId,
        })
        .andWhere(
          'userAccess.targetUserProfileId IN (:...targetUserProfileIds)',
          {
            targetUserProfileIds,
          },
        )
        .andWhere('targetProfile.profileType = :profileType', { profileType })
        .andWhere('targetProfile.deletedAt IS NULL')
        .andWhere(centerId ? 'userAccess.centerId = :centerId' : '1=1', {
          centerId,
        })
        .getMany();
    }

    return this.getRepository().find({
      where: {
        granterUserProfileId,
        targetUserProfileId: In(targetUserProfileIds),
        ...(centerId && { centerId }),
      },
    });
  }
}
