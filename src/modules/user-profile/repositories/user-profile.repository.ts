import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { UserProfile } from '../entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { Staff } from '@/modules/staff/entities/staff.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Student } from '@/modules/students/entities/student.entity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { isUUID } from 'class-validator';
@Injectable()
export class UserProfileRepository extends BaseRepository<UserProfile> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof UserProfile {
    return UserProfile;
  }

  findForUser(userId: string, userProfileId: string) {
    return this.getRepository().findOne({
      where: { userId, id: userProfileId },
    });
  }

  getTargetProfile(userProfileId: string, profileType: ProfileType) {
    return this.getProfileTypeRepository(profileType)
      .createQueryBuilder('profile')
      .leftJoin(UserProfile, 'userProfile', 'userProfile.id = :userProfileId', {
        userProfileId,
      })
      .getOne();
  }

  private getProfileTypeRepository(profileType: ProfileType) {
    // Use transactional entity manager if in a transaction
    const manager = this.getEntityManager();

    switch (profileType) {
      case ProfileType.ADMIN:
        return manager.getRepository(Admin);
      case ProfileType.STAFF:
        return manager.getRepository(Staff);
      case ProfileType.TEACHER:
        return manager.getRepository(Teacher);
      case ProfileType.STUDENT:
        return manager.getRepository(Student);
      // case ProfileType.PARENT:
      //   return manager.getRepository(Parent);
      default:
        throw new Error(`Unknown profile type: ${profileType}`);
    }
  }

  async findUserProfileByType(userId: string, profileType: ProfileType) {
    return this.getRepository().findOne({
      where: { userId, profileType },
    });
  }

  async isAdmin(userProfileId: string) {
    return this.getRepository().findOne({
      where: { id: userProfileId, profileType: ProfileType.ADMIN },
    });
  }

  async isStaff(userProfileId: string) {
    return this.getRepository().findOne({
      where: { id: userProfileId, profileType: ProfileType.STAFF },
    });
  }

  async findActiveStudentProfileByCode(
    code: string,
  ): Promise<UserProfile | null> {
    // Soft-deleted user_profiles are excluded by default (unless withDeleted is used)
    return this.getRepository().findOne({
      where: { code, profileType: ProfileType.STUDENT },
    });
  }

  /**
   * Optimized lookup that returns only userProfileId and code
   * Uses QueryBuilder for better performance
   */
  async findProfileLookupData(
    identifier: string,
  ): Promise<{ userProfileId: string; code: string } | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('profile')
      .select(['profile.id AS "userProfileId"', 'profile.code AS code']);

    // Check if identifier is a UUID (userProfileId) or student code

    if (isUUID(identifier)) {
      // Treat as userProfileId
      queryBuilder.where('profile.id = :identifier', { identifier });
    } else {
      // Treat as code (all profiles have codes)
      queryBuilder.where('profile.code = :identifier', { identifier });
    }

    const result = await queryBuilder.getRawOne();
    return result || null;
  }

  /**
   * Gets a profile reference entity by ID and type
   * @param profileRefId The ID of the profile reference entity
   * @param profileType The type of profile
   * @returns The profile reference entity
   */
  async getProfileRefEntity(
    profileRefId: string,
    profileType: ProfileType,
  ): Promise<Staff | Admin | Teacher | Student> {
    const repository = this.getProfileTypeRepository(profileType);
    const entity = await repository.findOne({ where: { id: profileRefId } });

    if (!entity) {
      throw new Error(
        `${profileType} entity with id ${profileRefId} not found`,
      );
    }

    return entity;
  }

  /**
   * Creates an empty profile reference entity based on profile type
   * @param profileType The type of profile to create
   * @returns The created entity ID
   */
  async createProfileRefEntity(profileType: ProfileType): Promise<string> {
    const manager = this.getEntityManager();
    let entity: Staff | Admin | Teacher | Student;

    switch (profileType) {
      case ProfileType.STAFF:
        entity = manager.create(Staff, {});
        break;
      case ProfileType.ADMIN:
        entity = manager.create(Admin, {});
        break;
      case ProfileType.TEACHER:
        entity = manager.create(Teacher, {});
        break;
      case ProfileType.STUDENT:
        entity = manager.create(Student, {});
        break;
      case ProfileType.PARENT:
        // TODO: Implement when Parent entity is created
        throw new Error('Parent profile type is not yet implemented');
      default:
        throw new Error(`Unknown profile type: ${String(profileType)}`);
    }

    const savedEntity = await manager.save(entity);
    return savedEntity.id;
  }
}
