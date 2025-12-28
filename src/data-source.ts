import { DataSource } from 'typeorm';
import { Config } from './shared/config/config';

const migrationConfig = {
  type: 'postgres' as const,
  host: Config.database.host,
  port: Config.database.port,
  username: Config.database.username,
  password: Config.database.password,
  database: Config.database.name,
  synchronize: false,
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  entities: ['src/**/*.entity.ts'],
  logging: ['error', 'warn'],
  extra: {
    timezone: 'Z',
  },
};

export default new DataSource(migrationConfig as any);
