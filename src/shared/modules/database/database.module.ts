import { Module } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DatabaseService } from '../../database.service';
import { getDatabaseConfig } from '../../config/database.config';
import { ExistsConstraint } from '../../common/validators/exists.constraint';
import { BelongsToCenterConstraint } from '../../common/validators/belongs-to-center.constraint';
import { IsUserProfileConstraint } from '@/shared/common/validators/is-user-profile.constraint';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
      },
      plugins: [
        new ClsPluginTransactional({
          imports: [
            TypeOrmModule.forRootAsync({
              useFactory: () => getDatabaseConfig(),
            }),
          ],
          adapter: new TransactionalAdapterTypeOrm({
            dataSourceToken: getDataSourceToken(),
          }),
        }),
      ],
    }),
  ],
  providers: [
    DatabaseService,
    ExistsConstraint,
    BelongsToCenterConstraint,
    IsUserProfileConstraint,
  ],
  exports: [
    DatabaseService,
    ExistsConstraint,
    BelongsToCenterConstraint,
    IsUserProfileConstraint,
  ],
})
export class DatabaseModule {}
