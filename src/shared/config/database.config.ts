import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST') || 'localhost',
  port: configService.get('DB_PORT') || 5432,
  username: configService.get('DB_USERNAME') || 'postgres',
  password: configService.get('DB_PASSWORD') || 'root',
  database: configService.get('DB_NAME') || 'lms',
  autoLoadEntities: true,
  synchronize: configService.get('NODE_ENV') === 'development' || configService.get('NODE_ENV') === 'test',
  logging: configService.get('NODE_ENV') === 'development',
});

// Export for direct use
export const typeOrmConfig = getDatabaseConfig(new ConfigService());
