import { Injectable, Logger } from '@nestjs/common';
import { ClassPackageRepository } from '../repositories/class-package.repository';
import { ClassPackage } from '../entities/class-package.entity';
import { CreateClassPackageDto } from '../dto/create-class-package.dto';
import { Money } from '@/shared/common/utils/money.util';
import { BaseService } from '@/shared/common/services/base.service';
import {
  BusinessLogicException,
  ResourceNotFoundException,
} from '@/shared/common/exceptions/custom.exceptions';
import { ClassesService } from '@/modules/classes/services/classes.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class ClassPackageService extends BaseService {
  private readonly logger = new Logger(ClassPackageService.name);

  constructor(
    private readonly classPackageRepository: ClassPackageRepository,
    private readonly classesService: ClassesService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super();
  }

  /**
   * Create a new class package
   */
  async createPackage(
    dto: CreateClassPackageDto,
    actor: ActorUser,
  ): Promise<ClassPackage> {
    // Validate class access
    await this.classesService.getClass(dto.classId, actor);

    // Validate center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
    });

    const packageData = {
      classId: dto.classId,
      name: dto.name,
      sessionCount: dto.sessionCount,
      price: new Money(dto.price),
      isActive: dto.isActive ?? true,
    };

    const packageEntity = await this.classPackageRepository.create(packageData);

    this.logger.log(
      `Created class package ${packageEntity.id} for class ${dto.classId} by user ${actor.userProfileId}`,
    );

    return packageEntity;
  }

  /**
   * Get package by ID
   */
  async getPackage(packageId: string): Promise<ClassPackage> {
    const packageEntity =
      await this.classPackageRepository.findByIdWithClass(packageId);

    if (!packageEntity) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.package',
        identifier: 't.resources.identifier',
        value: packageId,
      });
    }

    return packageEntity;
  }

  /**
   * Get active packages for a class
   */
  async getActivePackagesForClass(classId: string): Promise<ClassPackage[]> {
    return this.classPackageRepository.findActiveByClassId(classId);
  }

  /**
   * Get active packages for multiple classes
   */
  async getActivePackagesForClasses(
    classIds: string[],
  ): Promise<ClassPackage[]> {
    return this.classPackageRepository.findByClassIds(classIds);
  }

  /**
   * Update package
   */
  async updatePackage(
    packageId: string,
    updates: Partial<CreateClassPackageDto>,
    actor: ActorUser,
  ): Promise<ClassPackage> {
    const existingPackage = await this.getPackage(packageId);

    // Validate class access
    await this.classesService.getClass(existingPackage.classId, actor);

    const updateData: Partial<ClassPackage> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.sessionCount !== undefined)
      updateData.sessionCount = updates.sessionCount;
    if (updates.price !== undefined)
      updateData.price = new Money(updates.price);
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const updatedPackage = await this.classPackageRepository.update(
      packageId,
      updateData,
    );

    if (!updatedPackage) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.package',
        identifier: 't.resources.identifier',
        value: packageId,
      });
    }

    this.logger.log(
      `Updated class package ${packageId} by user ${actor.userProfileId}`,
    );

    return updatedPackage;
  }

  /**
   * Delete package (soft delete by setting inactive)
   */
  async deletePackage(packageId: string, actor: ActorUser): Promise<void> {
    const existingPackage = await this.getPackage(packageId);

    // Validate class access
    await this.classesService.getClass(existingPackage.classId, actor);

    await this.classPackageRepository.update(packageId, { isActive: false });

    this.logger.log(
      `Deactivated class package ${packageId} by user ${actor.userProfileId}`,
    );
  }

  /**
   * Validate package is active and belongs to class
   */
  async validatePackageForClass(
    packageId: string,
    classId: string,
  ): Promise<ClassPackage> {
    const packageEntity = await this.getPackage(packageId);

    if (!packageEntity.isActive) {
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    if (packageEntity.classId !== classId) {
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    return packageEntity;
  }

  /**
   * Paginate packages with optional filtering
   */
  async paginatePackages(paginationDto: any, actor: ActorUser): Promise<any> {
    // TODO: Implement proper pagination with filtering
    // For now, return mock pagination result
    const mockResult = {
      data: [],
      meta: {
        page: paginationDto.page || 1,
        limit: paginationDto.limit || 10,
        totalItems: 0,
        totalPages: 0,
      },
    };

    return mockResult;
  }
}
