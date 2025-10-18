import { Module } from '@nestjs/common';
import { LocaleController } from './controllers/locale.controller';
import { LocaleService } from './services/locale.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [LocaleController],
  providers: [LocaleService],
  exports: [LocaleService],
})
export class LocaleModule {}
