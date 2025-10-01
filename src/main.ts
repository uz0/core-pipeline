import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initTracing } from './telemetry/tracing';
import { LoggerService } from './services/logger.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Catch unhandled rejections to prevent Bull from crashing the app
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process - just log the error
  });

  try {
    // Log version information at startup
    console.log('='.repeat(80));
    console.log('🚨 ATTENTION!!!! APPLICATION STARTUP SEQUENCE BEGINNING 🚨');
    console.log('=== Core Pipeline Application Starting ===');
    console.log('='.repeat(80));

    // Read package.json version
    const packageJsonPath = path.join(__dirname, '../package.json');
    let appVersion = 'unknown';
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      appVersion = packageJson.version;
    } catch (e) {
      console.warn('Could not read package.json version');
    }

    console.log(`App Version: ${appVersion}`);
    console.log(`Node Version: ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // Try to read Git commit info (if available)
    try {
      const gitHeadPath = path.join(__dirname, '../.git/HEAD');
      if (fs.existsSync(gitHeadPath)) {
        const headContent = fs.readFileSync(gitHeadPath, 'utf8').trim();
        let commitHash = 'unknown';

        if (headContent.startsWith('ref: ')) {
          // It's a branch reference
          const refPath = headContent.substring(5);
          const refFile = path.join(__dirname, '../.git', refPath);
          if (fs.existsSync(refFile)) {
            commitHash = fs.readFileSync(refFile, 'utf8').trim().substring(0, 7);
          }
        } else {
          // It's a direct commit hash
          commitHash = headContent.substring(0, 7);
        }

        console.log(`Git Commit: ${commitHash}`);
      }
    } catch (e) {
      console.log('Git Commit: N/A (not in git repo or running in container)');
    }

    // Log IMAGE_TAG if set (for Kubernetes deployments)
    if (process.env.IMAGE_TAG) {
      console.log(`Image Tag: ${process.env.IMAGE_TAG}`);
    }

    console.log('='.repeat(80));

    initTracing();

    // Use default NestJS logger for development (pretty), custom for production (JSON)
    const isDevelopment = process.env.NODE_ENV !== 'production';

    const app = await NestFactory.create(AppModule, {
      logger: isDevelopment ? ['error', 'warn', 'log', 'debug', 'verbose'] : new LoggerService(),
      bufferLogs: false,
    });

    // Enable validation pipe globally
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

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
      console.log(
        'Swagger documentation is disabled in production. Set ENABLE_SWAGGER=true to enable.',
      );
    }
    await app.listen(port);

    console.log('='.repeat(80));
    console.log('🚨 ATTENTION!!!! APPLICATION SUCCESSFULLY STARTED 🚨');
    console.log('='.repeat(80));
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Metrics available at: http://localhost:${port}/metrics`);
    console.log(`Health check available at: http://localhost:${port}/health`);
    console.log(`Liveness check: http://localhost:${port}/health/liveness`);
    console.log(`Readiness check: http://localhost:${port}/health/readiness`);
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Bootstrap error:', error);
  process.exit(1);
});
