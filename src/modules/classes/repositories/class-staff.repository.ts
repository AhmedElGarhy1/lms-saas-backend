import { Injectable } from '@nestjs/common';
import { ClassStaff } from '../entities/class-staff.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { IsNull } from 'typeorm';
import { TimezoneService } from '@/shared/common/services/timezone.service';

@Injectable()
export class ClassStaffRepository extends BaseRepository<ClassStaff> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof ClassStaff {
    return ClassStaff;
  }

  /**
   * Find ClassStaff assignment for a specific user and class.
   * Pure data access method - no business logic.
   *
   * @param userProfileId - The user profile ID
   * @param classId - The class ID
   * @returns ClassStaff assignment or null if not found
   */
  async findClassStaff(
    userProfileId: string,
    classId: string,
  ): Promise<ClassStaff | null> {
    return this.getRepository().findOne({
      where: { userProfileId, classId, leftAt: IsNull() },
    });
  }

  /**
   * Find ClassStaff assignment using DTO.
   * Pure data access method - no business logic.
   *
   * @param data - ClassStaffAccessDto
   * @param includeLeft - Whether to include assignments where leftAt is not null (default: false)
   * @returns ClassStaff assignment or null if not found
   */
  async findClassStaffAccess(
    data: ClassStaffAccessDto,
    includeLeft: boolean = false,
  ): Promise<ClassStaff | null> {
    const where: any = { ...data };
    if (!includeLeft) {
      where.leftAt = IsNull();
    }
    return this.getRepository().findOne({
      where,
    });
  }

  /**
   * Find all ClassStaff assignments for a specific class.
   * Pure data access method - no business logic.
   *
   * @param classId - The class ID
   * @returns Array of ClassStaff assignments
   */
  async findByClassId(classId: string): Promise<ClassStaff[]> {
    return this.getRepository().find({
      where: { classId, leftAt: IsNull() },
      relations: ['profile'],
    });
  }

  /**
   * Find all ClassStaff assignments for a specific user profile.
   * Pure data access method - no business logic.
   *
   * @param userProfileId - The user profile ID
   * @param centerId - Optional center ID to filter by
   * @returns Array of ClassStaff assignments
   */
  async findByUserProfileId(
    userProfileId: string,
    centerId?: string,
  ): Promise<ClassStaff[]> {
    const where: any = { userProfileId, leftAt: IsNull() };
    if (centerId) {
      where.centerId = centerId;
    }
    return this.getRepository().find({
      where,
      relations: ['class'],
    });
  }

  /**
   * Create a new ClassStaff assignment.
   * Pure data access method - no business logic.
   *
   * @param data - ClassStaff assignment data
   * @returns Created ClassStaff assignment
   */
  async createClassStaff(data: {
    userProfileId: string;
    classId: string;
    centerId: string;
    branchId: string;
  }): Promise<ClassStaff> {
    return this.create(data);
  }

  /**
   * Grant class staff access using DTO.
   * Pure data access method - no business logic.
   * Creates a new assignment record for history tracking.
   *
   * @param data - ClassStaffAccessDto
   * @param centerId - Center ID (from actor)
   * @param branchId - Branch ID (from validated class entity, snapshot value)
   * @returns Created ClassStaff assignment
   */
  async grantClassStaffAccess(
    data: ClassStaffAccessDto,
    centerId: string,
    branchId: string,
  ): Promise<ClassStaff> {
    return this.create({
      ...data,
      centerId,
      branchId,
      joinedAt: TimezoneService.getZonedNowFromContext(),
    });
  }

  /**
   * Revoke class staff access using DTO.
   * Pure data access method - no business logic.
   *
   * @param data - ClassStaffAccessDto
   * @returns Removed ClassStaff assignment
   */
  async revokeClassStaffAccess(data: ClassStaffAccessDto): Promise<ClassStaff> {
    const existingAccess = await this.findClassStaffAccess(data);
    if (!existingAccess) {
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.classStaffAccess',
      });
    }

    const leftAt = TimezoneService.getZonedNowFromContext();
    await this.update(existingAccess.id, { leftAt });
    existingAccess.leftAt = leftAt;
    return existingAccess;
  }

  /**
   * Delete all ClassStaff assignments for a given class ID.
   * Pure data access method - no business logic.
   * Used for cascade delete when a class is deleted.
   *
   * @param classId - The class ID
   * @returns Promise that resolves when deletion is complete
   */
  async deleteByClassId(classId: string): Promise<void> {
    await this.getRepository().delete({ classId });
  }
}
