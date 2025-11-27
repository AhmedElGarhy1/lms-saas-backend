import {
  Entity,
  Column,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad,
} from 'typeorm';
import { ProfileRole } from './profile-role.entity';
import { BaseEntity } from '@/shared/common/entities/base.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { RolePermission } from './role-permission.entity';
import { TranslationService } from '@/shared/services/translation.service';
import { I18nPath } from '@/generated/i18n.generated';

@Entity('roles')
@Index(['name', 'centerId'], { unique: true })
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  centerId?: string;

  @Column({ type: 'boolean', default: false })
  readOnly: boolean;

  // Relations
  @OneToMany(() => ProfileRole, (profileRole) => profileRole.role)
  profileRoles: ProfileRole[];

  @ManyToOne(() => Center, (center) => center.roles, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center?: Center;

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: RolePermission[];

  @BeforeInsert()
  @BeforeUpdate()
  isSameScope(centerId?: string) {
    return !!this.centerId === !!centerId;
  }

  @AfterLoad()
  translate() {
    // Only translate if readOnly = true (system roles)
    if (!this.readOnly) return;

    this.name = TranslationService.translate(this.name as I18nPath);
    if (this.description) {
      this.description = TranslationService.translate(
        this.description as I18nPath,
      );
    }
  }
}
