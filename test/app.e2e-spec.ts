import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ok (GET)', () => {
    return request(app.getHttpServer()).get('/ok').expect(200).expect({ status: 'ok' });
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('info');
        expect(res.body).toHaveProperty('details');
      });
  });

  it('/health/liveness (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/liveness')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/health/readiness (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/readiness')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/metrics (GET)', () => {
    return request(app.getHttpServer())
      .get('/metrics')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('# HELP');
        expect(res.text).toContain('# TYPE');
      });
  });
});
