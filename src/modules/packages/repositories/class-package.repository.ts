import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { ClassPackage } from '../entities/class-package.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class ClassPackageRepository extends BaseRepository<ClassPackage> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof ClassPackage {
    return ClassPackage;
  }

  /**
   * Find active packages for a specific class
   */
  async findActiveByClassId(classId: string): Promise<ClassPackage[]> {
    return this.getRepository().find({
      where: { classId, isActive: true },
      relations: ['class'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find package by ID with class relation
   */
  async findByIdWithClass(id: string): Promise<ClassPackage | null> {
    return this.getRepository().findOne({
      where: { id },
      relations: ['class'],
    });
  }

  /**
   * Find packages for multiple classes
   */
  async findByClassIds(classIds: string[]): Promise<ClassPackage[]> {
    return this.getRepository().find({
      where: { classId: In(classIds), isActive: true },
      relations: ['class'],
      order: { createdAt: 'DESC' },
    });
  }
}
