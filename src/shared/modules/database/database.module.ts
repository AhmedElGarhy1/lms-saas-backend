import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database.service';
import { getDatabaseConfig, typeOrmConfig } from '../../config/database.config';
import { ExistsConstraint } from '../../common/validators/exists.constraint';

export const DATABASE_INJECTION_TOKEN = 'DatabaseService';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
  ],
  providers: [
    {
      provide: DATABASE_INJECTION_TOKEN,
      useClass: DatabaseService,
    },
    DatabaseService,
    ExistsConstraint,
  ],
  exports: [DATABASE_INJECTION_TOKEN, DatabaseService, ExistsConstraint],
})
export class DatabaseModule {}
