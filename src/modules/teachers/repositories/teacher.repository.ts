import { Injectable } from '@nestjs/common';
import { Teacher } from '../entities/teacher.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class TeacherRepository extends BaseRepository<Teacher> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Teacher {
    return Teacher;
  }

  // Teacher-specific repository methods can be added here as needed
}
