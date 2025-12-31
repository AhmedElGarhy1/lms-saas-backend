import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './shared/config/database.config';

const migrationConfig = {
  ...getDatabaseConfig(),
  synchronize: false,
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  // Don't load entities for migrations - they can cause import issues
  entities: [],
  logging: ['error', 'warn'],
};

export default new DataSource(migrationConfig as any);
