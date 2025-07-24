import { Module } from '@nestjs/common';
import { GuardiansController } from './guardians.controller';
import { GuardiansService } from './guardians.service';
import { PrismaService } from '../shared/prisma.service';

@Module({
  controllers: [GuardiansController],
  providers: [GuardiansService, PrismaService],
  exports: [GuardiansService],
})
export class GuardiansModule {}
