import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '@/modules/user/entities/user.entity';
import { Profile } from '@/modules/user/entities/profile.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { Center } from '@/modules/centers/entities/center.entity';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { UserCenter } from '@/modules/access-control/entities/user-center.entity';
import { Role } from '@/modules/access-control/entities/roles/role.entity';
import { UserRole } from '@/modules/access-control/entities/roles/user-role.entity';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { ActivityLog } from '@/shared/modules/activity-log/entities/activity-log.entity';

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
  // synchronize: configService.get('NODE_ENV') === 'development',
  // logging: configService.get('NODE_ENV') === 'development',
  synchronize: true,
  // logging: true,
});

// Export for direct use
export const typeOrmConfig = getDatabaseConfig(new ConfigService());
