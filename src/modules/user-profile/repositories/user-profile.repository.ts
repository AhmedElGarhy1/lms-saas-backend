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

  /**
   * Find a user profile by ID optimized for API responses.
   * Loads user relation fully (needed for profile display) and selective audit fields.
   * Use this method when returning data to API clients.
   *
   * @param userProfileId - User profile ID
   * @param includeDeleted - Whether to include soft-deleted profiles
   * @returns UserProfile with user relation fully loaded and selective audit fields, or null if not found
   */
  async findUserProfileForResponse(
    userProfileId: string,
    includeDeleted: boolean = false,
  ): Promise<UserProfile | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('userProfile')
      // Join user relation (full entity needed for profile view)
      .leftJoinAndSelect('userProfile.user', 'user')
      // Audit relations
      .leftJoin('userProfile.creator', 'creator')
      .leftJoin('creator.user', 'creatorUser')
      .leftJoin('userProfile.updater', 'updater')
      .leftJoin('updater.user', 'updaterUser')
      .leftJoin('userProfile.deleter', 'deleter')
      .leftJoin('deleter.user', 'deleterUser')
      // Add audit fields as selections
      .addSelect([
        'creator.id',
        'creatorUser.id',
        'creatorUser.name',
        'updater.id',
        'updaterUser.id',
        'updaterUser.name',
        'deleter.id',
        'deleterUser.id',
        'deleterUser.name',
      ])
      .where('userProfile.id = :userProfileId', { userProfileId });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find a user profile by ID optimized for API responses, throws if not found.
   * Loads user relation fully (needed for profile display) and selective audit fields.
   * Use this method when returning data to API clients.
   *
   * @param userProfileId - User profile ID
   * @param includeDeleted - Whether to include soft-deleted profiles
   * @returns UserProfile with user relation fully loaded and selective audit fields
   * @throws Error if user profile not found
   */
  async findUserProfileForResponseOrThrow(
    userProfileId: string,
    includeDeleted: boolean = false,
  ): Promise<UserProfile> {
    const userProfile = await this.findUserProfileForResponse(
      userProfileId,
      includeDeleted,
    );
    if (!userProfile) {
      throw new Error(`User profile with id ${userProfileId} not found`);
    }
    return userProfile;
  }

  /**
   * Find a user profile by ID with full relations loaded for internal use.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param userProfileId - User profile ID
   * @param includeDeleted - Whether to include soft-deleted profiles
   * @returns UserProfile with full relations loaded, or null if not found
   */
  async findUserProfileWithFullRelations(
    userProfileId: string,
    includeDeleted: boolean = false,
  ): Promise<UserProfile | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('userProfile')
      // Load FULL entities using leftJoinAndSelect for all relations
      .leftJoinAndSelect('userProfile.user', 'user')
      .where('userProfile.id = :userProfileId', { userProfileId });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find a user profile by ID with full relations loaded for internal use, throws if not found.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param userProfileId - User profile ID
   * @param includeDeleted - Whether to include soft-deleted profiles
   * @returns UserProfile with full relations loaded
   * @throws Error if user profile not found
   */
  async findUserProfileWithFullRelationsOrThrow(
    userProfileId: string,
    includeDeleted: boolean = false,
  ): Promise<UserProfile> {
    const userProfile = await this.findUserProfileWithFullRelations(
      userProfileId,
      includeDeleted,
    );
    if (!userProfile) {
      throw new Error(`User profile with id ${userProfileId} not found`);
    }
    return userProfile;
  }
}
