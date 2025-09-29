import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initTracing } from './telemetry/tracing';
import { LoggerService } from './services/logger.service';

async function bootstrap() {
  try {
    initTracing();

    const app = await NestFactory.create(AppModule, {
      logger: new LoggerService(),
      bufferLogs: true,
    });

    // Enable CORS for the domains
    app.enableCors({
      origin: [
        'https://core-pipeline.theedgestory.org',
        'https://core-pipeline.dev.theedgestory.org',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    const port = process.env.PORT || 3000;
    
    // Configure Swagger
    const isProduction = process.env.NODE_ENV === 'production';
    
    const configBuilder = new DocumentBuilder()
      .setTitle('Core Pipeline API')
      .setDescription('Consolidated API for testing all system components - Database, Redis, Kafka')
      .setVersion('1.0')
      .addTag('showcase', 'Showcase API - All features consolidated')
      .addTag('health', 'Health check endpoints')
      .addTag('metrics', 'Metrics endpoints');
    
    // Add appropriate servers based on environment
    if (isProduction) {
      configBuilder.addServer('https://core-pipeline.theedgestory.org', 'Production');
    } else if (process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'development') {
      configBuilder.addServer('https://core-pipeline.dev.theedgestory.org', 'Development');
    }
    configBuilder.addServer(`http://localhost:${port}`, 'Local');
    
    const config = configBuilder.build();
    
    const document = SwaggerModule.createDocument(app, config);
    
    // Enable Swagger in development or if explicitly enabled in production
    if (!isProduction || process.env.ENABLE_SWAGGER === 'true') {
      SwaggerModule.setup('api-docs', app, document, {
        customSiteTitle: 'Core Pipeline API Documentation',
        customfavIcon: 'https://swagger.io/favicon-32x32.png',
        customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      });
      console.log(`Swagger documentation available at: http://localhost:${port}/api-docs`);
    } else {
      console.log('Swagger documentation is disabled in production. Set ENABLE_SWAGGER=true to enable.');
    }
    await app.listen(port);

    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Metrics available at: http://localhost:${port}/metrics`);
    console.log(`Health check available at: http://localhost:${port}/health`);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Bootstrap error:', error);
  process.exit(1);
});
