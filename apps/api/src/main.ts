import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DatabaseService } from './database/database.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Seed full municipal fleet (4,608 luminaires across Ganderbal & Katra) for live server
  const dbService = app.get(DatabaseService);
  dbService.seedFullFleet(365);
  logger.log('Municipal fleet seeded with 4,608 streetlights and GIS corridors.');

  // Security Headers Middleware (Enterprise Hardening)
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  app.enableCors({
    origin: [
      'http://localhost:3333',
      'http://127.0.0.1:3333',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/ready', 'health/live'],
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 SmartLight OS Backend API running at http://localhost:${port}/api/v1`);
  logger.log(`🩺 Health check available at http://localhost:${port}/health`);
}

bootstrap();
