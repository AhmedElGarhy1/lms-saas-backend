import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from './entities/teacher.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Teacher])],
  controllers: [],
  providers: [],
  exports: [],
})
export class TeachersModule {}
