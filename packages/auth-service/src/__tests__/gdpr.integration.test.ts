import request from 'supertest';
import express from 'express';
import gdprRoutes from '../routes/gdprRoutes';
import { authenticate } from '../middleware/authenticate';
import pool from '../db/connection';
import { runMigrations } from '../db/migrate';
import { generateAccessToken } from '../utils/jwt';

const app = express();
app.use(express.json());
app.use('/gdpr', gdprRoutes);

describe('GDPR Integration Tests', () => {
  let testUserId: string;
  let testToken: string;

  beforeAll(async () => {
    // Run migrations
    await runMigrations();

    // Create a test user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['gdpr-test@example.com', 'hashed_password', 'student', 'Test', 'User', true]
    );
    testUserId = result.rows[0].id;

    // Generate test token
    testToken = generateAccessToken({
      userId: testUserId,
      email: 'gdpr-test@example.com',
      role: 'student',
    });
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM user_consents WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM data_export_requests WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM data_deletion_requests WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  describe('Consent Management', () => {
    it('should record user consent', async () => {
      const response = await request(app)
        .post('/gdpr/consent')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          consentType: 'terms',
          granted: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get current consents', async () => {
      const response = await request(app)
        .get('/gdpr/consent/current')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('terms');
    });

    it('should get consent history', async () => {
      const response = await request(app)
        .get('/gdpr/consent/history')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Data Export', () => {
    it('should request data export', async () => {
      const response = await request(app)
        .post('/gdpr/export')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requestId');
    });

    it('should download exported data', async () => {
      const response = await request(app)
        .get('/gdpr/export/download')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('exportedAt');
      expect(response.body).toHaveProperty('userId', testUserId);
    });
  });

  describe('Data Deletion', () => {
    it('should request data deletion', async () => {
      const response = await request(app)
        .post('/gdpr/delete')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          reason: 'Test deletion request',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requestId');
      expect(response.body.data).toHaveProperty('gracePeriod', '30 days');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/gdpr/consent/current');

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/gdpr/consent/current')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});

