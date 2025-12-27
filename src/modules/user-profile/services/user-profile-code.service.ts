import { Injectable } from '@nestjs/common';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

const PREFIX_MAP: Record<ProfileType, string> = {
  [ProfileType.STUDENT]: 'STU',
  [ProfileType.TEACHER]: 'TEA',
  [ProfileType.STAFF]: 'STA',
  [ProfileType.ADMIN]: 'ADM',
  [ProfileType.PARENT]: 'PAR', // reserved but supported for code generation
};

@Injectable()
export class UserProfileCodeService {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  /**
   * Generate a new profile code in format: PREFIX-YY-000001
   * - PREFIX: 3-char prefix derived from ProfileType
   * - YY: UTC year (2 digits)
   * - Counter: per rolePrefix+yearYY, global scope, allocated atomically in Postgres
   */
  async generate(profileType: ProfileType): Promise<string> {
    const prefix = PREFIX_MAP[profileType];
    const yearYY = String(new Date().getUTCFullYear()).slice(-2);

    if (!this.txHost?.tx) {
      throw new Error('Transaction context is not available');
    }

    const rows: Array<{ currentValue: number }> = await this.txHost.tx.query(
      `
      INSERT INTO "profile_code_counters" ("rolePrefix", "yearYY", "currentValue")
      VALUES ($1, $2, 1)
      ON CONFLICT ("rolePrefix", "yearYY")
      DO UPDATE SET "currentValue" = "profile_code_counters"."currentValue" + 1
      RETURNING "currentValue";
      `,
      [prefix, yearYY],
    );

    const currentValue = rows?.[0]?.currentValue;
    if (!currentValue || currentValue < 1) {
      throw new Error('Failed to allocate profile code counter value');
    }

    const seq = String(currentValue).padStart(6, '0');
    return `${prefix}-${yearYY}-${seq}`;
  }
}
