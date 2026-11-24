import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { Comment } from '../src/models/comment.js';
import { Post } from '../src/models/post.js';
import { Credential, Follow, Session, User } from '../src/models/index.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'assignment-2-test-secret-at-least-32-characters';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/social_app_course_test';

const { createApp } = await import('../src/app.js');
const credentials = new Map<string, string>();
const app = createApp({ async sendCredential(email, _purpose, token) { credentials.set(email, token); } });
const api = request(app);
const users: { id: string; auth: { Authorization: string } }[] = [];
const missing = new Types.ObjectId().toString();
const posts = '/api/posts';
const comments = '/api/comments';
const byPost = (id: string) => `${posts}/${id}/comments`;
const account = (index: number) => users[index]!;
let mongo: MongoMemoryServer | undefined;

beforeAll(async () => {
  const uri = process.env.TEST_MONGODB_URI;
  if (uri && new URL(uri).pathname !== '/social_app_course_test') throw new Error('Tests may only use social_app_course_test');
  if (!uri) mongo = await MongoMemoryServer.create({ instance: { dbName: 'social_app_course_test' } });
  // Use an isolated memory server, or a separate namespace on the provided test server.
  const dbName = mongo ? 'social_app_course_test' : `social_app_course_test_assignment2_${new Types.ObjectId()}`;
  await mongoose.connect(uri ?? mongo!.getUri(dbName), { dbName });
  await Promise.all([User.init(), Credential.init(), Session.init(), Follow.init(), Post.init(), Comment.init()]);
  const password = 'Assignment2-password-123';
  for (const username of ['writer', 'commenter', 'observer']) {
    const email = `${username}@assignment2.test`;
    const registered = await api.post('/api/auth/register').send({ email, username, password });
    expect(registered.status).toBe(201);
    expect((await api.post('/api/auth/verify-email').send({ credential: credentials.get(email) })).status).toBe(200);
    const login = await api.post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    users.push({ id: registered.body.data.id, auth: { Authorization: `Bearer ${login.body.data.accessToken}` } });
  }
}, 180000);

afterAll(async () => {
  try {
    if (!mongo && mongoose.connection.readyState === 1 &&
        mongoose.connection.name.startsWith('social_app_course_test_assignment2_')) {
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  } finally {
    await mongo?.stop();
  }
});

async function createPost(index = 0) {
  const res = await api.post(posts).set(account(index).auth).send({ content: '  Test post  ' });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ success: true, data: { author: account(index).id, content: 'Test post' } });
  return res.body.data._id as string;
}

async function createComment(postId: string, index = 1) {
  const res = await api.post(byPost(postId)).set(account(index).auth).send({ content: '  Test comment  ' });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ success: true, data: { author: account(index).id, post: postId, content: 'Test comment' } });
  return res.body.data._id as string;
}

describe('Assignment 2 posts', () => {
  it('creates authenticated posts, persists authors, and lists only own posts newest first', async () => {
    expect((await api.get(posts).set(account(2).auth)).body.data).toEqual([]);
    const first = await createPost();
    const other = await createPost(1);
    const newest = await createPost();
    expect((await Post.findById(first))?.author.toString()).toBe(account(0).id);
    const list = await api.get(posts).set(account(0).auth);
    expect(list.status).toBe(200);
    expect(list.body.data.slice(0, 2).map((post: { _id: string }) => post._id)).toEqual([newest, first]);
    expect(list.body.data.map((post: { _id: string }) => post._id)).not.toContain(other);
  });

  it('validates content and rejects anonymous requests and owner spoofing', async () => {
    expect((await api.post(posts).send({ content: 'hello' })).status).toBe(401);
    for (const body of [{}, { content: '  ' }, { content: 123 }, { content: 'x'.repeat(2001) },
      { content: 'hello', author: account(1).id }]) {
      expect((await api.post(posts).set(account(0).auth).send(body)).status).toBe(400);
    }
  });

  it('reads a public post with authentication and handles invalid and missing IDs', async () => {
    const id = await createPost();
    expect((await api.get(`${posts}/${id}`)).status).toBe(401);
    const res = await api.get(`${posts}/${id}`).set(account(1).auth);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(id);
    expect(res.text).not.toMatch(/email|passwordHash|authVersion|tokenHash/);
    expect((await api.get(`${posts}/bad`).set(account(0).auth)).status).toBe(400);
    expect((await api.get(`${posts}/${missing}`).set(account(0).auth)).status).toBe(404);
  });

  it('restricts updates and deletion to the owner, validates edits and updates timestamps', async () => {
    const id = await createPost();
    const path = `${posts}/${id}`;
    const original = await Post.findById(id).orFail();
    expect((await api.patch(path).set(account(1).auth).send({ content: 'edit' })).status).toBe(403);
    expect((await api.patch(path).set(account(0).auth).send({ content: 'edit', author: account(1).id })).status).toBe(400);
    const edit = await api.patch(path).set(account(0).auth).send({ content: '  edit  ' });
    expect(edit.status).toBe(200);
    expect(edit.body.data).toMatchObject({ content: 'edit', author: account(0).id, createdAt: original.createdAt.toISOString() });
    expect(Date.parse(edit.body.data.updatedAt)).toBeGreaterThan(original.updatedAt.getTime());
    expect((await api.delete(path).set(account(2).auth)).status).toBe(403);
    expect((await api.delete(path).set(account(0).auth)).status).toBe(204);
    expect(await Post.exists({ _id: id })).toBeNull();
  });
});

describe('Assignment 2 comments', () => {
  it('persists references, filters the list by post, and retrieves a single comment', async () => {
    const id = await createPost();
    const other = await createPost();
    expect((await api.get(byPost(id)).set(account(0).auth)).body.data).toEqual([]);
    const first = await createComment(id);
    const second = await createComment(id, 0);
    await createComment(other);
    const stored = await Comment.findById(first).orFail();
    expect(stored.author.toString()).toBe(account(1).id);
    expect(stored.post.toString()).toBe(id);
    const list = await api.get(byPost(id)).set(account(2).auth);
    expect(list.status).toBe(200);
    expect(list.body.data.map((comment: { _id: string }) => comment._id)).toEqual([first, second]);
    const single = await api.get(`${comments}/${first}`).set(account(0).auth);
    expect(single.status).toBe(200);
    expect(single.body.data._id).toBe(first);
    expect(single.text).not.toMatch(/email|passwordHash|authVersion|tokenHash/);
  });

  it('rejects anonymous creation, invalid inputs, and missing parents or comments', async () => {
    const id = await createPost();
    expect((await api.post(byPost(id)).send({ content: 'hello' })).status).toBe(401);
    for (const body of [{}, { content: '  ' }, { content: 'x'.repeat(1001) }, { content: 'hello', post: id }]) {
      expect((await api.post(byPost(id)).set(account(1).auth).send(body)).status).toBe(400);
    }
    expect((await api.post(byPost(missing)).set(account(1).auth).send({ content: 'hello' })).status).toBe(404);
    expect((await api.get(byPost(missing)).set(account(1).auth)).status).toBe(404);
    expect((await api.get(byPost('bad')).set(account(1).auth)).status).toBe(400);
    expect((await api.get(`${comments}/bad`).set(account(1).auth)).status).toBe(400);
    expect((await api.get(`${comments}/${missing}`).set(account(1).auth)).status).toBe(404);
  });

  it('allows only the comment author to edit and rejects parent reassignment', async () => {
    const id = await createPost();
    const comment = await createComment(id);
    const path = `${comments}/${comment}`;
    for (const index of [0, 2]) {
      expect((await api.patch(path).set(account(index).auth).send({ content: 'edit' })).status).toBe(403);
    }
    expect((await api.patch(path).set(account(1).auth).send({ content: 'edit', post: missing })).status).toBe(400);
    const edit = await api.patch(path).set(account(1).auth).send({ content: 'edit' });
    expect(edit.status).toBe(200);
    expect(edit.body.data).toMatchObject({ content: 'edit', post: id, author: account(1).id });
  });

  it('allows both authorized deletion cases and denies an unrelated user', async () => {
    const id = await createPost();
    for (const index of [1, 0]) {
      const comment = await createComment(id);
      const path = `${comments}/${comment}`;
      expect((await api.delete(path).set(account(2).auth)).status).toBe(403);
      expect((await api.delete(path).set(account(index).auth)).status).toBe(204);
      expect(await Comment.exists({ _id: comment })).toBeNull();
    }
  });

  it('honors private visibility for owners, pending followers and accepted followers', async () => {
    const id = await createPost();
    const comment = await createComment(id);
    const settings = '/api/users/me/settings';
    const owner = account(0);
    const follower = account(1);
    expect((await api.patch(settings).set(owner.auth).send({ visibility: 'PRIVATE' })).status).toBe(200);
    try {
      const follow = await api.post(`/api/users/${owner.id}/follow`).set(follower.auth);
      expect(follow.status).toBe(201);
      expect(follow.body.data.status).toBe('PENDING');
      for (const path of [`${posts}/${id}`, byPost(id), `${comments}/${comment}`]) {
        expect((await api.get(path).set(owner.auth)).status).toBe(200);
        expect((await api.get(path).set(follower.auth)).status).toBe(403);
        expect((await api.get(path).set(account(2).auth)).status).toBe(403);
      }
      expect((await api.post(byPost(id)).set(follower.auth).send({ content: 'pending' })).status).toBe(403);
      expect((await api.post(`/api/follows/${follow.body.data.id}/accept`).set(owner.auth)).status).toBe(200);
      for (const path of [`${posts}/${id}`, byPost(id), `${comments}/${comment}`]) {
        expect((await api.get(path).set(follower.auth)).status).toBe(200);
      }
      const otherComment = await createComment(id, 0);
      expect((await api.delete(`${comments}/${otherComment}`).set(follower.auth)).status).toBe(403);
      await createComment(id);
    } finally {
      await api.delete(`/api/users/${owner.id}/follow`).set(follower.auth);
      await api.patch(settings).set(owner.auth).send({ visibility: 'PUBLIC' });
    }
  });

  it('cascades post deletion without removing comments on other posts', async () => {
    const id = await createPost();
    const first = await createComment(id);
    await createComment(id, 0);
    const other = await createComment(await createPost());
    expect((await api.delete(`${posts}/${id}`).set(account(0).auth)).status).toBe(204);
    expect(await Comment.countDocuments({ post: id })).toBe(0);
    expect(await Comment.exists({ _id: other })).not.toBeNull();
    expect((await api.get(`${comments}/${first}`).set(account(1).auth)).status).toBe(404);
    expect((await api.post(byPost(id)).set(account(1).auth).send({ content: 'late' })).status).toBe(404);
  });

  it('removes a late insert when comment creation races with post deletion', async () => {
    const id = await createPost();
    const insert = Comment.collection.insertOne.bind(Comment.collection);
    const delayed = vi.spyOn(Comment.collection, 'insertOne').mockImplementationOnce(async (...args) => {
      expect((await api.delete(`${posts}/${id}`).set(account(0).auth)).status).toBe(204);
      return insert(...args);
    });
    try {
      expect((await api.post(byPost(id)).set(account(1).auth).send({ content: 'late' })).status).toBe(404);
      expect(await Comment.countDocuments({ post: id })).toBe(0);
    } finally {
      delayed.mockRestore();
    }
  });

  it('hides a post during a failed cascade and lets the owner retry cleanup', async () => {
    const id = await createPost();
    const comment = await createComment(id);
    const cleanup = vi.spyOn(Comment, 'deleteMany').mockImplementationOnce(() => { throw new Error('cleanup failed'); });
    try {
      expect((await api.delete(`${posts}/${id}`).set(account(0).auth)).status).toBe(500);
      expect((await api.get(`${comments}/${comment}`).set(account(1).auth)).status).toBe(404);
      expect(await Post.exists({ _id: id })).not.toBeNull();
    } finally {
      cleanup.mockRestore();
    }
    expect((await api.delete(`${posts}/${id}`).set(account(0).auth)).status).toBe(204);
    expect(await Comment.exists({ _id: comment })).toBeNull();
  });
});
