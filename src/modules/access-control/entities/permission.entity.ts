import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  AfterLoad,
} from 'typeorm';
import { Center } from '../../centers/entities/center.entity';
import { PermissionScope } from '@/modules/access-control/constants/permissions';
import { TranslationService } from '@/shared/services/translation.service';
import { I18nPath } from '@/generated/i18n.generated';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  group: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: PermissionScope.CENTER,
  })
  scope: PermissionScope;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @OneToMany(() => Center, (center) => center.id, { nullable: true })
  centerId: string | null;

  @AfterLoad()
  translate() {
    // Always translate (all permissions are system-defined)
    this.name = TranslationService.translate(this.name as I18nPath);
    if (this.description) {
      this.description = TranslationService.translate(
        this.description as I18nPath,
      );
    }
    // Translate group name
    if (this.group) {
      const groupTranslationKey =
        `t.permissions.groups.${this.group}` as I18nPath;
      try {
        this.group = TranslationService.translate(groupTranslationKey);
      } catch {
        // If translation fails, keep original group name
      }
    }
  }
}
