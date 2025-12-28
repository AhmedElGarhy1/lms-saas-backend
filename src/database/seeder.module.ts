import { Module } from '@nestjs/common';
import { DatabaseSeeder } from './seeder';
import { DatabaseModule } from '@/shared/modules/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DatabaseSeeder],
  exports: [DatabaseSeeder],
})
export class SeederModule {}
