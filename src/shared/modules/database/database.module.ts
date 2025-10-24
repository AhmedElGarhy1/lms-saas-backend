import { Module } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DatabaseService } from '../../database.service';
import { getDatabaseConfig, typeOrmConfig } from '../../config/database.config';
import { ExistsConstraint } from '../../common/validators/exists.constraint';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
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
              imports: [ConfigModule],
              useFactory: (configService: ConfigService) =>
                getDatabaseConfig(configService),
              inject: [ConfigService],
            }),
          ],
          adapter: new TransactionalAdapterTypeOrm({
            dataSourceToken: getDataSourceToken(),
          }),
        }),
      ],
    }),
  ],
  providers: [DatabaseService, ExistsConstraint],
  exports: [DatabaseService, ExistsConstraint],
})
export class DatabaseModule {}
