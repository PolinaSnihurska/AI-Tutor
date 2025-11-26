import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../routes/authRoutes';
import pool from '../db/connection';
import { User, ParentChildLink } from '../models';

let app: Express;

beforeAll(async () => {
  // Set up Express app
  app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  
  // Clean up test data
  await pool.query('DELETE FROM parent_child_links WHERE 1=1');
  await pool.query('DELETE FROM subscriptions WHERE 1=1');
  await pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');
});

afterEach(async () => {
  // Clean up after each test
  await pool.query('DELETE FROM parent_child_links WHERE 1=1');
  await pool.query('DELETE FROM subscriptions WHERE 1=1');
  await pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');
});

describe('Authentication Integration Tests', () => {
  describe('POST /auth/register', () => {
    it('should register a new student user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'student@test.com',
          password: 'SecurePass123!',
          role: 'student',
          firstName: 'John',
          lastName: 'Doe',
          age: 15,
          grade: 10,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toMatchObject({
        email: 'student@test.com',
        role: 'student',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should register a new parent user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'parent@test.com',
          password: 'SecurePass123!',
          role: 'parent',
          firstName: 'Jane',
          lastName: 'Smith',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('parent');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'weak@test.com',
          password: '123',
          role: 'student',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'SecurePass123!',
        role: 'student',
        firstName: 'Test',
        lastName: 'User',
      };

      await request(app).post('/auth/register').send(userData);
      
      const response = await request(app).post('/auth/register').send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'login@test.com',
          password: 'SecurePass123!',
          role: 'student',
          firstName: 'Login',
          lastName: 'Test',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('login@test.com');
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh-token', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'refresh@test.com',
          password: 'SecurePass123!',
          role: 'student',
          firstName: 'Refresh',
          lastName: 'Test',
        });

      refreshToken = response.body.data.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh-token')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
