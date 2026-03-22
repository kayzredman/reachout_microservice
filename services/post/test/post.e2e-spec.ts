import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Post } from '../../../shared';

describe('PostController (e2e)', () => {
  let app: INestApplication;
  let createdPost: Post;

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

  it('/posts (POST) creates a post', async () => {
    const postData = {
      userId: 'user1',
      content: 'Hello world',
      status: 'draft',
    };
    const res = await request(app.getHttpServer())
      .post('/posts')
      .send(postData)
      .expect(201);
    expect(res.body).toMatchObject(postData);
    expect(res.body.id).toBeDefined();
    createdPost = res.body;
  });

  it('/posts (GET) returns all posts', async () => {
    const res = await request(app.getHttpServer())
      .get('/posts')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('/posts/:id (GET) returns a post', async () => {
    const res = await request(app.getHttpServer())
      .get(`/posts/${createdPost.id}`)
      .expect(200);
    expect(res.body.id).toBe(createdPost.id);
  });

  it('/posts/:id (PUT) updates a post', async () => {
    const res = await request(app.getHttpServer())
      .put(`/posts/${createdPost.id}`)
      .send({ content: 'Updated content', status: 'published' })
      .expect(200);
    expect(res.body.content).toBe('Updated content');
    expect(res.body.status).toBe('published');
  });

  it('/posts/:id (DELETE) removes a post', async () => {
    await request(app.getHttpServer())
      .delete(`/posts/${createdPost.id}`)
      .expect(200);
    // Should not find the post anymore
    await request(app.getHttpServer())
      .get(`/posts/${createdPost.id}`)
      .expect(404);
  });
});
