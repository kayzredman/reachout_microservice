import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Support Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/tickets (POST)', () => {
    return request(app.getHttpServer())
      .post('/tickets')
      .send({
        orgId: 'org_test',
        userId: 'user_test',
        subject: 'Test ticket',
        description: 'Something is not working',
      })
      .expect(201);
  });
});
