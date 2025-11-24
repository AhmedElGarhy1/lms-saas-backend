import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { CenterAccess } from '../entities/center-access.entity';
import { CenterAccessDto } from '../dto/center-access.dto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class CenterAccessRepository extends BaseRepository<CenterAccess> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly i18n: I18nService<I18nTranslations>,
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
      throw new ConflictException(
        this.i18n.translate('t.errors.accessAlreadyExists'),
      );
    }

    return this.create(data);
  }

  async revokeCenterAccess(data: CenterAccessDto) {
    const existingAccess = await this.findCenterAccess(data);
    if (!existingAccess) {
      throw new NotFoundException(
        this.i18n.translate('t.errors.accessNotFound'),
      );
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
