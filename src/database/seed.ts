import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseSeeder } from './seeder';
import { LoggerService } from '@/shared/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = app.get(LoggerService);

  try {
    logger.info('Starting database seeding process...', 'SeedScript');

    const seeder = app.get(DatabaseSeeder);

    await seeder.seed();

    logger.info('Database seeding completed successfully!', 'SeedScript');
    await app.close();

    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error during seeding', error, 'SeedScript');
    } else {
      logger.error('Error during seeding', 'SeedScript', { error: String(error) });
    }
    await app.close();
    process.exit(1);
  }
}

bootstrap();
