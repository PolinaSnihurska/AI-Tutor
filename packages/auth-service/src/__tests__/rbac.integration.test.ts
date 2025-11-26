import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import authRoutes from '../routes/authRoutes';
import { authenticate } from '../middleware/authenticate';
import { authorize, authorizeStudent, authorizeParent } from '../middleware/authorize';
import pool from '../db/connection';

let app: Express;

beforeAll(async () => {
  // Set up Express app with test routes
  app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  
  // Test routes for RBAC
  app.get('/test/student-only', authenticate, authorizeStudent, (req: Request, res: Response) => {
    res.json({ success: true, message: 'Student access granted' });
  });
  
  app.get('/test/parent-only', authenticate, authorizeParent, (req: Request, res: Response) => {
    res.json({ success: true, message: 'Parent access granted' });
  });
  
  app.get('/test/admin-only', authenticate, authorize('admin'), (req: Request, res: Response) => {
    res.json({ success: true, message: 'Admin access granted' });
  });
  
  app.get('/test/student-or-parent', authenticate, authorize('student', 'parent'), (req: Request, res: Response) => {
    res.json({ success: true, message: 'Student or parent access granted' });
  });
  
  // Clean up test data
  await pool.query('DELETE FROM parent_child_links WHERE 1=1');
  await pool.query('DELETE FROM subscriptions WHERE 1=1');
  await pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');
});

afterEach(async () => {
  await pool.query('DELETE FROM parent_child_links WHERE 1=1');
  await pool.query('DELETE FROM subscriptions WHERE 1=1');
  await pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');
});

describe('RBAC Middleware Integration Tests', () => {
  let studentToken: string;
  let parentToken: string;

  beforeEach(async () => {
    // Register student
    const studentResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'student@test.com',
        password: 'SecurePass123!',
        role: 'student',
        firstName: 'Student',
        lastName: 'User',
      });
    studentToken = studentResponse.body.data.accessToken;

    // Register parent
    const parentResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'parent@test.com',
        password: 'SecurePass123!',
        role: 'parent',
        firstName: 'Parent',
        lastName: 'User',
      });
    parentToken = parentResponse.body.data.accessToken;
  });

  describe('Student-only routes', () => {
    it('should allow student access', async () => {
      const response = await request(app)
        .get('/test/student-only')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny parent access', async () => {
      const response = await request(app)
        .get('/test/student-only')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permissions');
    });

    it('should deny unauthenticated access', async () => {
      const response = await request(app).get('/test/student-only');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Parent-only routes', () => {
    it('should allow parent access', async () => {
      const response = await request(app)
        .get('/test/parent-only')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny student access', async () => {
      const response = await request(app)
        .get('/test/parent-only')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Admin-only routes', () => {
    it('should deny student access', async () => {
      const response = await request(app)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should deny parent access', async () => {
      const response = await request(app)
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Multi-role routes', () => {
    it('should allow student access to student-or-parent route', async () => {
      const response = await request(app)
        .get('/test/student-or-parent')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow parent access to student-or-parent route', async () => {
      const response = await request(app)
        .get('/test/student-or-parent')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Invalid token scenarios', () => {
    it('should reject expired or malformed tokens', async () => {
      const response = await request(app)
        .get('/test/student-only')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing authorization header', async () => {
      const response = await request(app).get('/test/student-only');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
