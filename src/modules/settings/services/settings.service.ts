import { Injectable, Logger } from '@nestjs/common';
import { SettingRepository } from '../repositories/setting.repository';
import { Setting } from '../entities/setting.entity';
import { SettingType } from '../enums/setting-type.enum';
import { SETTING_KEYS } from '../constants/setting-keys.constant';
import { Money } from '@/shared/common/utils/money.util';
import { BaseService } from '@/shared/common/services/base.service';
import { Transactional } from '@nestjs-cls/transactional';
import { RequestContext } from '@/shared/common/context/request.context';
import { SYSTEM_USER_ID } from '@/shared/common/constants/system-actor.constant';

@Injectable()
export class SettingsService extends BaseService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(public readonly settingRepository: SettingRepository) {
    super();
  }

  /**
   * Get setting by key with type conversion
   */
  @Transactional()
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.settingRepository.findByKey(key);
    return setting?.value ?? null;
  }

  /**
   * Set or update a setting value
   */
  @Transactional()
  async setSetting(
    key: string,
    value: string | number | boolean | object,
    type?: SettingType,
  ): Promise<Setting> {
    let stringValue: string;
    let settingType: SettingType;

    if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
      settingType = SettingType.JSON;
    } else if (typeof value === 'boolean') {
      stringValue = value.toString();
      settingType = SettingType.BOOLEAN;
    } else if (typeof value === 'number') {
      stringValue = value.toString();
      settingType = SettingType.DECIMAL;
    } else {
      stringValue = value;
      settingType = type ?? SettingType.STRING;
    }

    const existing = await this.settingRepository.findByKey(key);

    if (existing) {
      existing.value = stringValue;
      existing.type = settingType;
      return (await this.settingRepository.update(existing.id, existing))!;
    } else {
      const ctx = RequestContext.get();
      const createdByProfileId = ctx.userProfileId || SYSTEM_USER_ID;

      return await this.settingRepository.create({
        key,
        value: stringValue,
        type: settingType,
        createdByProfileId,
      });
    }
  }

  /**
   * Get fees percentage
   */
  async getFees(): Promise<number> {
    const value = await this.getSetting(SETTING_KEYS.FEES);
    return value ? parseFloat(value) : 0;
  }

  /**
   * Set fees percentage
   */
  async setFees(percentage: number): Promise<Setting> {
    return this.setSetting(SETTING_KEYS.FEES, percentage, SettingType.DECIMAL);
  }

  /**
   * Get max debit amount
   */
  async getMaxDebit(): Promise<Money> {
    const value = await this.getSetting(SETTING_KEYS.MAX_DEBIT);
    return value ? Money.from(value) : Money.zero();
  }

  /**
   * Set max debit amount
   */
  async setMaxDebit(amount: Money): Promise<Setting> {
    return this.setSetting(
      SETTING_KEYS.MAX_DEBIT,
      amount.toString(),
      SettingType.DECIMAL,
    );
  }

  /**
   * Get max negative balance amount
   */
  async getMaxNegativeBalance(): Promise<Money> {
    const value = await this.getSetting(SETTING_KEYS.MAX_NEGATIVE_BALANCE);
    return value ? Money.from(value) : Money.zero();
  }

  /**
   * Set max negative balance amount
   */
  async setMaxNegativeBalance(amount: Money): Promise<Setting> {
    return this.setSetting(
      SETTING_KEYS.MAX_NEGATIVE_BALANCE,
      amount.toString(),
      SettingType.DECIMAL,
    );
  }

  /**
   * Get all settings as key-value map
   */
  async getAllSettings(): Promise<Record<string, string>> {
    return this.settingRepository.getAllSettings();
  }
}
