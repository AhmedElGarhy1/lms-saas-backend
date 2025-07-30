import { DataSource } from 'typeorm';
import * as entities from './src/modules/user/entities';
import * as authEntities from './src/modules/auth/entities';
import * as accessControlEntities from './src/modules/access-control/entities';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'lms',
  entities: [
    ...Object.values(entities),
    ...Object.values(authEntities),
    ...Object.values(accessControlEntities),
  ],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  synchronize:
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test',
  logging: process.env.NODE_ENV === 'development',
});
