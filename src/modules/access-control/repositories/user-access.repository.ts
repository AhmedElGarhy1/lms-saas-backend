import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { UserAccess } from '../entities/user-access.entity';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class UserAccessRepository extends BaseRepository<UserAccess> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly i18n: I18nService<I18nTranslations>,
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
    if (!userAccess)
      throw new NotFoundException(
        this.i18n.translate('t.errors.userAccessNotFound'),
      );
    await this.getRepository().remove(userAccess);
  }

  async listUserAccesses(userProfileId: string): Promise<UserAccess[]> {
    return this.getRepository().find({
      where: { granterUserProfileId: userProfileId },
    });
  }
}
