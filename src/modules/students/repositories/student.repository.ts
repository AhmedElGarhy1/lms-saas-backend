import { Injectable } from '@nestjs/common';
import { Student } from '../entities/student.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class StudentRepository extends BaseRepository<Student> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Student {
    return Student;
  }

  // Student-specific repository methods can be added here as needed
}
