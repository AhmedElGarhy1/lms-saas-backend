import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseSeeder } from './seeder';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('SeedScript');

  try {
    const seeder = app.get(DatabaseSeeder);

    await seeder.seed();

    await app.close();

    process.exit(0);
  } catch (error) {
    logger.error(
      'Error during seeding',
      error instanceof Error ? error.stack : String(error),
    );
    await app.close();
    process.exit(1);
  }
}

bootstrap();
