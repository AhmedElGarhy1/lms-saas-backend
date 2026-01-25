import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { SettingRepository } from './repositories/setting.repository';
import { SettingsService } from './services/settings.service';
import { SettingsController } from './controllers/settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [SettingsController],
  providers: [SettingRepository, SettingsService],
  exports: [SettingsService, SettingRepository],
})
export class SettingsModule {}
