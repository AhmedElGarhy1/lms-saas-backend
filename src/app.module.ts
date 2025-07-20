import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';
import { UsersModule } from './users/users.module';
import { CentersModule } from './centers/centers.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { AccessControlModule } from './access-control/access-control.module';
import { GradeLevelsModule } from './academic-grades/grade-levels.module';
import { GroupsModule } from './groups/groups.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TeachersModule } from './teachers/teachers.module';
import { StudentsModule } from './students/students.module';
import { SchedulesModule } from './schedules/schedules.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple(),
          ),
        }),
      ],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: process.env.NODE_ENV === 'test' ? 1 : 60000,
          limit: process.env.NODE_ENV === 'test' ? 1000 : 10,
        },
      ],
    }),
    SharedModule,
    AuthModule,
    UsersModule,
    CentersModule,
    AccessControlModule,
    GradeLevelsModule,
    GroupsModule,
    SubjectsModule,
    TeachersModule,
    StudentsModule,
    SchedulesModule,
    AttendanceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new JwtAuthGuard(reflector),
      inject: [Reflector],
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
