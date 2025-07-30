import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database.service';
import { getDatabaseConfig } from '../../config/database.config';

export const DATABASE_INJECTION_TOKEN = 'DatabaseService';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: DATABASE_INJECTION_TOKEN,
      useClass: DatabaseService,
    },
    DatabaseService,
  ],
  exports: [DATABASE_INJECTION_TOKEN, DatabaseService],
})
export class DatabaseModule {}
