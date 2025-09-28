import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from 'pino';
import { initTracing } from './telemetry/tracing';
import { LoggerService } from './services/logger.service';

async function bootstrap() {
  const tracer = initTracing();

  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
    bufferLogs: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Core Pipeline API')
    .setDescription('Core Pipeline REST API with observability')
    .setVersion('1.0')
    .addTag('health', 'Health check endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = app.get(LoggerService);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api-docs`);
  logger.log(`Metrics available at: http://localhost:${port}/metrics`);
}

bootstrap();