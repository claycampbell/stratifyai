import request from 'supertest';
import app from '../../server';
import pool from '../../config/database';
import { generateAccessToken } from '../../middleware/auth';

describe('User Impersonation API', () => {
  let superAdminToken: string;
  let regularUserToken: string;
  let superAdminId: string;
  let regularUserId: string;
  let targetUserId: string;

  beforeAll(async () => {
    // Create test users
    // Super Admin
    const superAdminResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = 'super_admin'))
       RETURNING id`,
      ['superadmin@test.com', 'hashedpassword', 'Super', 'Admin']
    );
    superAdminId = superAdminResult.rows[0].id;
    superAdminToken = generateAccessToken(superAdminId);

    // Regular User (staff)
    const regularUserResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = 'staff'))
       RETURNING id`,
      ['regular@test.com', 'hashedpassword', 'Regular', 'User']
    );
    regularUserId = regularUserResult.rows[0].id;
    regularUserToken = generateAccessToken(regularUserId);

    // Target User to impersonate (manager)
    const targetUserResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = 'manager'))
       RETURNING id`,
      ['target@test.com', 'hashedpassword', 'Target', 'User']
    );
    targetUserId = targetUserResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await pool.query('DELETE FROM audit_log WHERE user_id = $1', [superAdminId]);
    await pool.end();
  });

  describe('POST /api/users/impersonate/:id', () => {
    it('should allow super admin to impersonate active user', async () => {
      const response = await request(app)
        .post(`/api/users/impersonate/${targetUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('impersonatedUser');
      expect(response.body).toHaveProperty('originalUser');
      expect(response.body.impersonatedUser.id).toBe(targetUserId);
      expect(response.body.impersonatedUser.email).toBe('target@test.com');
      expect(response.body.impersonatedUser.role).toBe('manager');
      expect(response.body.originalUser.id).toBe(superAdminId);
    });

    it('should prevent non-admin from impersonating', async () => {
      const response = await request(app)
        .post(`/api/users/impersonate/${targetUserId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should prevent impersonating inactive users', async () => {
      // Create inactive user
      const inactiveUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active)
         VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = 'staff'), false)
         RETURNING id`,
        ['inactive@test.com', 'hashedpassword', 'Inactive', 'User']
      );
      const inactiveUserId = inactiveUserResult.rows[0].id;

      const response = await request(app)
        .post(`/api/users/impersonate/${inactiveUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User not found or inactive');

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [inactiveUserId]);
    });

    it('should prevent self-impersonation', async () => {
      const response = await request(app)
        .post(`/api/users/impersonate/${superAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Cannot impersonate yourself');
    });

    it('should log impersonation actions to audit log', async () => {
      await request(app)
        .post(`/api/users/impersonate/${targetUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Check audit log
      const auditLog = await pool.query(
        `SELECT * FROM audit_log
         WHERE user_id = $1 AND action = 'impersonate_user' AND entity_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [superAdminId, targetUserId]
      );

      expect(auditLog.rows).toHaveLength(1);
      expect(auditLog.rows[0].action).toBe('impersonate_user');
      expect(auditLog.rows[0].entity_type).toBe('user');

      const details = JSON.parse(auditLog.rows[0].details);
      expect(details.impersonated_user).toBe('target@test.com');
      expect(details.impersonated_role).toBe('manager');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/users/impersonate/${fakeUuid}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User not found or inactive');
    });

    it('should return 401 without authentication token', async () => {
      await request(app)
        .post(`/api/users/impersonate/${targetUserId}`)
        .expect(401);
    });

    it('should include all user details in response', async () => {
      const response = await request(app)
        .post(`/api/users/impersonate/${targetUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const { impersonatedUser, originalUser } = response.body;

      // Check impersonated user details
      expect(impersonatedUser).toHaveProperty('id');
      expect(impersonatedUser).toHaveProperty('email');
      expect(impersonatedUser).toHaveProperty('first_name');
      expect(impersonatedUser).toHaveProperty('last_name');
      expect(impersonatedUser).toHaveProperty('department');
      expect(impersonatedUser).toHaveProperty('title');
      expect(impersonatedUser).toHaveProperty('role');
      expect(impersonatedUser).toHaveProperty('role_display_name');
      expect(impersonatedUser).toHaveProperty('permissions');
      expect(impersonatedUser).toHaveProperty('is_email_verified');

      // Check original user details
      expect(originalUser).toHaveProperty('id');
      expect(originalUser).toHaveProperty('email');
      expect(originalUser).toHaveProperty('first_name');
      expect(originalUser).toHaveProperty('last_name');
    });
  });

  describe('POST /api/users/stop-impersonation', () => {
    it('should successfully stop impersonation', async () => {
      const response = await request(app)
        .post('/api/users/stop-impersonation')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Impersonation stopped successfully');
    });

    it('should log stop impersonation action', async () => {
      await request(app)
        .post('/api/users/stop-impersonation')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Check audit log
      const auditLog = await pool.query(
        `SELECT * FROM audit_log
         WHERE user_id = $1 AND action = 'stop_impersonation'
         ORDER BY created_at DESC LIMIT 1`,
        [superAdminId]
      );

      expect(auditLog.rows).toHaveLength(1);
      expect(auditLog.rows[0].action).toBe('stop_impersonation');

      const details = JSON.parse(auditLog.rows[0].details);
      expect(details.stopped_impersonation).toBe(true);
    });

    it('should return 401 without authentication token', async () => {
      await request(app)
        .post('/api/users/stop-impersonation')
        .expect(401);
    });
  });

  describe('Impersonation Security', () => {
    it('should only return active users for impersonation', async () => {
      // Try to query for an inactive user
      const inactiveUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active)
         VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = 'staff'), false)
         RETURNING id`,
        ['sectest@test.com', 'hashedpassword', 'SecTest', 'User']
      );
      const inactiveUserId = inactiveUserResult.rows[0].id;

      const response = await request(app)
        .post(`/api/users/impersonate/${inactiveUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      expect(response.body.error).toContain('User not found or inactive');

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [inactiveUserId]);
    });

    it('should validate user ID format', async () => {
      const response = await request(app)
        .post('/api/users/impersonate/invalid-uuid')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(500); // Database will reject invalid UUID

      expect(response.body).toHaveProperty('error');
    });

    it('should maintain audit trail for all impersonation events', async () => {
      // Start impersonation
      await request(app)
        .post(`/api/users/impersonate/${targetUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Stop impersonation
      await request(app)
        .post('/api/users/stop-impersonation')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Check both actions are logged
      const auditLog = await pool.query(
        `SELECT action, entity_type FROM audit_log
         WHERE user_id = $1 AND action IN ('impersonate_user', 'stop_impersonation')
         ORDER BY created_at DESC LIMIT 2`,
        [superAdminId]
      );

      expect(auditLog.rows).toHaveLength(2);
      expect(auditLog.rows[0].action).toBe('stop_impersonation');
      expect(auditLog.rows[1].action).toBe('impersonate_user');
    });
  });
});
