import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Enable CORS (adjust as needed)
  app.enableCors();

  const port = process.env.PORT || 3000;

  // Swagger/OpenAPI configuration (before globalPrefix)
  const config = new DocumentBuilder()
    .setTitle('Kairos API')
    .setDescription('Timesheet and PTO Management System API')
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}/api/v1`, 'Local Development')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'Session token (obtained from /auth/login)',
      },
      'session',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  // Mount Swagger at /api (excluded from global prefix)
  SwaggerModule.setup('api', app, document);

  // Set global prefix AFTER Swagger (exclude Swagger endpoints)
  app.setGlobalPrefix('api/v1', {
    exclude: ['api*'],
  });

  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}

bootstrap();
