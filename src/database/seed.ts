import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseSeeder } from './seeder';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('SeedScript');

  try {
    logger.log('Starting database seeding process...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const seeder = app.get(DatabaseSeeder);

    await seeder.seed();

    logger.log('Database seeding completed successfully!');
    await app.close();

    process.exit(0);
  } catch (error) {
    logger.error('Error during seeding:', error);
    process.exit(1);
  }
}

bootstrap();
