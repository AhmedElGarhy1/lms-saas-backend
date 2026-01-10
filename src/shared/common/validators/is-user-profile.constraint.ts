import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserProfile } from '@/modules/user-profile/entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsUserProfileConstraint implements ValidatorConstraintInterface {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [profileType] = args.constraints as [ProfileType];

    if (!value) return true; // Let other validators handle null/undefined

    if (!this.dataSource) {
      throw new Error('DataSource is not available in IsUserProfileConstraint');
    }

    try {
      const repo = this.dataSource.getRepository(UserProfile);
      const query = repo
        .createQueryBuilder('profile')
        .where('profile.id = :id', { id: value });

      if (profileType) {
        query.andWhere('profile.profileType = :profileType', { profileType });
      }

      const exists = await query.getExists();
      return exists;
    } catch (error) {
      return false;
    }
  }
}
