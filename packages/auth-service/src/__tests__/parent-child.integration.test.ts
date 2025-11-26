import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import authRoutes from '../routes/authRoutes';
import { authenticate } from '../middleware/authenticate';
import { authorizeParent } from '../middleware/authorize';
import { verifyParentChildAccess } from '../middleware/parentChildAccess';
import pool from '../db/connection';
import { User, ParentChildLink } from '../models';

let app: Express;

beforeAll(async () => {
  // Set up Express app
  app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  
  // Test routes for parent-child access
  app.post('/test/link-child', authenticate, authorizeParent, async (req: Request, res: Response) => {
    try {
      const parentId = req.user?.userId;
      const { childId } = req.body;
      
      if (!parentId || !childId) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      
      const link = await ParentChildLink.create({ parentId, childId });
      res.json({ success: true, data: link });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed' });
    }
  });
  
  app.get('/test/child/:childId/data', authenticate, authorizeParent, verifyParentChildAccess, (req: Request, res: Response) => {
    res.json({ success: true, message: 'Access granted to child data' });
  });
  
  app.delete('/test/unlink-child/:childId', authenticate, authorizeParent, async (req: Request, res: Response) => {
    try {
      const parentId = req.user?.userId;
      const { childId } = req.params;
      
      if (!parentId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      await ParentChildLink.delete(parentId, childId);
      res.json({ success: true, message: 'Child unlinked' });
    } catch (error) {
      res.status(400).json({ success: false, error: 'Failed to unlink' });
    }
  });
  
  app.get('/test/my-children', authenticate, authorizeParent, async (req: Request, res: Response) => {
    try {
      const parentId = req.user?.userId;
      
      if (!parentId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      const children = await ParentChildLink.getChildrenProfiles(parentId);
      res.json({ success: true, data: children });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get children' });
    }
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

describe('Parent-Child Linking Authorization Tests', () => {
  let parentToken: string;
  let parentId: string;
  let childToken: string;
  let childId: string;
  let otherParentToken: string;
  let otherParentId: string;

  beforeEach(async () => {
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
    parentId = parentResponse.body.data.user.id;

    // Register child (student)
    const childResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'child@test.com',
        password: 'SecurePass123!',
        role: 'student',
        firstName: 'Child',
        lastName: 'User',
        age: 12,
        grade: 7,
      });
    childToken = childResponse.body.data.accessToken;
    childId = childResponse.body.data.user.id;

    // Register another parent
    const otherParentResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'otherparent@test.com',
        password: 'SecurePass123!',
        role: 'parent',
        firstName: 'Other',
        lastName: 'Parent',
      });
    otherParentToken = otherParentResponse.body.data.accessToken;
    otherParentId = otherParentResponse.body.data.user.id;
  });

  describe('Parent-child linking', () => {
    it('should allow parent to link a child', async () => {
      const response = await request(app)
        .post('/test/link-child')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ childId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('parentId', parentId);
      expect(response.body.data).toHaveProperty('childId', childId);
    });

    it('should prevent duplicate parent-child links', async () => {
      // First link
      await request(app)
        .post('/test/link-child')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ childId });

      // Try to link again
      const response = await request(app)
        .post('/test/link-child')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ childId });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent student from linking children', async () => {
      const response = await request(app)
        .post('/test/link-child')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ childId: parentId });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Parent-child access verification', () => {
    beforeEach(async () => {
      // Link parent and child
      await request(app)
        .post('/test/link-child')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ childId });
    });

    it('should allow parent to access their child data', async () => {
      const response = await request(app)
        .get(`/test/child/${childId}/data`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny parent access to non-linked child data', async () => {
      const response = await request(app)
        .get(`/test/child/${childId}/data`)
        .set('Authorization', `Bearer ${otherParentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not authorized');
    });

    it('should deny student access to parent-only routes', async () => {
      const response = await request(app)
        .get(`/test/child/${childId}/data`)
        .set('Authorization', `Bearer ${childToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Parent-child unlinking', () => {
    beforeEach(async () => {
      // Link parent and child
      await request(app)
        .post('/test/link-child')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ childId });
    });

    it('should allow parent to unlink their child', async () => {
      const response = await request(app)
        .delete(`/test/unlink-child/${childId}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify access is revoked
      const accessResponse = await request(app)
        .get(`/test/child/${childId}/data`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(accessResponse.status).toBe(403);
    });

    it('should prevent other parents from unlinking', async () => {
      const response = await request(app)
        .delete(`/test/unlink-child/${childId}`)
        .set('Authorization', `Bearer ${otherParentToken}`);

      expect(response.status).toBe(200); // Delete is idempotent
      
      // Verify original parent still has access
      const accessResponse = await request(app)
        .get(`/test/child/${childId}/data`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(accessResponse.status).toBe(200);
    });
  });

  describe('Get children list', () => {
    it('should return empty list for parent with no children', async () => {
      const response = await request(app)
        .get('/test/my-children')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return list of linked children', async () => {
      // Link child
      await request(app)
        .post('/test/link-child')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ childId });

      const response = await request(app)
        .get('/test/my-children')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: childId,
        email: 'child@test.com',
        role: 'student',
      });
    });

    it('should only return children linked to requesting parent', async () => {
      // Link child to first parent
      await request(app)
        .post('/test/link-child')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ childId });

      // Other parent should see empty list
      const response = await request(app)
        .get('/test/my-children')
        .set('Authorization', `Bearer ${otherParentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });
});
