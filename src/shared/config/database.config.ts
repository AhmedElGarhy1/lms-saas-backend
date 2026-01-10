import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Config } from './config';

export const getDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: Config.database.host,
  port: Config.database.port,
  username: Config.database.username,
  password: Config.database.password,
  database: Config.database.name,
  autoLoadEntities: true,
  synchronize: false,
  logging: ['error', 'warn'], // Only log errors and warnings
  extra: {
    timezone: 'Z', // Force UTC for all timestamps
  },
});
