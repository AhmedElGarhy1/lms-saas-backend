import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { ClassPackage } from './entities/class-package.entity';
import { StudentPackage } from './entities/student-package.entity';

// Repositories
import { ClassPackageRepository } from './repositories/class-package.repository';
import { StudentPackageRepository } from './repositories/student-package.repository';

// Services
import { ClassPackageService } from './services/class-package.service';
import { StudentPackageService } from './services/student-package.service';

// Controllers
import { PackagesController } from './controllers/packages.controller';
import { StudentPackagesController } from './controllers/student-packages.controller';

// Shared modules
import { SharedModule } from '@/shared/shared.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { ClassesModule } from '../classes/classes.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassPackage, StudentPackage]),
    SharedModule,
    AccessControlModule,
    ClassesModule,
    forwardRef(() => FinanceModule),
  ],
  controllers: [PackagesController, StudentPackagesController],
  providers: [
    // Repositories
    ClassPackageRepository,
    StudentPackageRepository,

    // Services
    ClassPackageService,
    StudentPackageService,
  ],
  exports: [
    // Repositories
    ClassPackageRepository,
    StudentPackageRepository,

    // Services
    ClassPackageService,
    StudentPackageService,
  ],
})
export class PackagesModule {}
