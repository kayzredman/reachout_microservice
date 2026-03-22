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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .post('/posts')
      .send(postData)
      .expect(201);
    const body = res.body as Post;
    expect(body).toMatchObject(postData);
    expect(body.id).toBeDefined();
    createdPost = body;
  });

  it('/posts (GET) returns all posts', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer()).get('/posts').expect(200);
    const body = res.body as Post[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('/posts/:id (GET) returns a post', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .get(`/posts/${createdPost.id}`)
      .expect(200);
    const body = res.body as Post;
    expect(body.id).toBe(createdPost.id);
  });

  it('/posts/:id (PUT) updates a post', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .put(`/posts/${createdPost.id}`)
      .send({ content: 'Updated content', status: 'published' })
      .expect(200);
    const body = res.body as Post;
    expect(body.content).toBe('Updated content');
    expect(body.status).toBe('published');
  });

  it('/posts/:id (DELETE) removes a post', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer())
      .delete(`/posts/${createdPost.id}`)
      .expect(200);
    // Should not find the post anymore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer())
      .get(`/posts/${createdPost.id}`)
      .expect(404);
  });
});
