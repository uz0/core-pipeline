import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { TracingService } from './tracing/tracing.service';

async function bootstrap() {
  const tracingService = new TracingService();
  await tracingService.start();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  app.useLogger(app.get(Logger));
  
  const config = new DocumentBuilder()
    .setTitle('Core Pipeline API')
    .setDescription('Core Pipeline NestJS Application with Observability')
    .setVersion('1.0')
    .addTag('health')
    .addTag('metrics')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  const logger = app.get(Logger);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api-docs`);
  logger.log(`Metrics endpoint available at: http://localhost:${port}/metrics`);
}
bootstrap();