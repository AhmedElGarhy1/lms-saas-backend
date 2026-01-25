import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { Setting } from '../entities/setting.entity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class SettingRepository extends BaseRepository<Setting> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Setting {
    return Setting;
  }

  /**
   * Find setting by key
   */
  async findByKey(key: string): Promise<Setting | null> {
    return this.getRepository().findOne({
      where: { key },
    });
  }

  /**
   * Get all settings as a key-value map
   */
  async getAllSettings(): Promise<Record<string, string>> {
    const settings = await this.getRepository().find();
    return settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>,
    );
  }
}
