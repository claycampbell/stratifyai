import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '../types';

const router = Router();

// Get all users (admin only)
router.get('/', authenticate, authorize('*', 'manage_users'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.department, u.title,
              u.is_active, u.created_at, u.last_login, u.login_count,
              r.name as role_name, r.display_name as role_display_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticate, authorize('*', 'manage_users'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.department, u.title,
              u.avatar_url, u.is_active, u.is_email_verified, u.created_at,
              u.last_login, u.login_count, u.preferences,
              r.id as role_id, r.name as role_name, r.display_name as role_display_name,
              r.permissions
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user (admin only)
router.put('/:id', authenticate, authorize('*', 'manage_users'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, department, title, role_id, is_active } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           department = COALESCE($4, department),
           title = COALESCE($5, title),
           role_id = COALESCE($6, role_id),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, email, first_name, last_name, department, title, is_active`,
      [first_name, last_name, email, department, title, role_id, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, 'update_user', 'user', $2, $3, $4, $5)`,
      [req.user?.id, id, JSON.stringify({ updates: req.body }), req.ip, req.get('user-agent')]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('*'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, 'delete_user', 'user', $2, $3, $4, $5)`,
      [req.user?.id, id, JSON.stringify(result.rows[0]), req.ip, req.get('user-agent')]
    );

    res.json({ message: 'User deleted successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get all roles (admin only)
router.get('/roles/list', authenticate, authorize('*', 'manage_users'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, display_name, description, permissions, is_system_role
       FROM roles
       ORDER BY
         CASE name
           WHEN 'super_admin' THEN 1
           WHEN 'athletics_director' THEN 2
           WHEN 'department_director' THEN 3
           WHEN 'manager' THEN 4
           WHEN 'staff' THEN 5
           WHEN 'viewer' THEN 6
           ELSE 7
         END`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

// Get system statistics (admin only)
router.get('/stats/overview', authenticate, authorize('*', 'manage_users'), async (req: AuthRequest, res: Response) => {
  try {
    const [userStats, roleStats, activityStats] = await Promise.all([
      // User statistics
      pool.query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_active = true) as active_users,
          COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') as active_last_week,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_last_month
        FROM users
      `),
      // Users by role
      pool.query(`
        SELECT r.display_name as role, COUNT(u.id) as count
        FROM roles r
        LEFT JOIN users u ON u.role_id = r.id
        GROUP BY r.id, r.display_name, r.name
        ORDER BY
          CASE r.name
            WHEN 'super_admin' THEN 1
            WHEN 'athletics_director' THEN 2
            WHEN 'department_director' THEN 3
            WHEN 'manager' THEN 4
            WHEN 'staff' THEN 5
            WHEN 'viewer' THEN 6
            ELSE 7
          END
      `),
      // Recent activity
      pool.query(`
        SELECT action, COUNT(*) as count
        FROM audit_log
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `)
    ]);

    res.json({
      users: userStats.rows[0],
      usersByRole: roleStats.rows,
      recentActivity: activityStats.rows
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get audit log (admin only)
router.get('/audit/log', authenticate, authorize('*'), async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 100, offset = 0, user_id, action } = req.query;

    let query = `
      SELECT a.id, a.action, a.entity_type, a.entity_id, a.details,
             a.ip_address, a.created_at,
             u.email as user_email, u.first_name, u.last_name
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND a.user_id = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }

    if (action) {
      query += ` AND a.action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

// Impersonate user (super admin only)
router.post('/impersonate/:id', authenticate, authorize('*'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent impersonating yourself
    if (id === req.user?.id) {
      return res.status(400).json({ error: 'Cannot impersonate yourself' });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.department, u.title,
              u.avatar_url, u.is_active, u.is_email_verified,
              r.id as role_id, r.name as role, r.display_name as role_display_name,
              r.permissions
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or inactive' });
    }

    const impersonatedUser = result.rows[0];

    // Log audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, 'impersonate_user', 'user', $2, $3, $4, $5)`,
      [
        req.user?.id,
        id,
        JSON.stringify({
          impersonated_user: impersonatedUser.email,
          impersonated_role: impersonatedUser.role
        }),
        req.ip,
        req.get('user-agent')
      ]
    );

    // Return impersonated user data with original admin info
    res.json({
      impersonatedUser: {
        id: impersonatedUser.id,
        email: impersonatedUser.email,
        first_name: impersonatedUser.first_name,
        last_name: impersonatedUser.last_name,
        department: impersonatedUser.department,
        title: impersonatedUser.title,
        avatar_url: impersonatedUser.avatar_url,
        role: impersonatedUser.role,
        role_display_name: impersonatedUser.role_display_name,
        permissions: impersonatedUser.permissions,
        is_email_verified: impersonatedUser.is_email_verified
      },
      originalUser: {
        id: req.user?.id,
        email: req.user?.email,
        first_name: req.user?.first_name,
        last_name: req.user?.last_name
      }
    });
  } catch (error) {
    console.error('Impersonate user error:', error);
    res.status(500).json({ error: 'Failed to impersonate user' });
  }
});

// Stop impersonation (super admin only)
router.post('/stop-impersonation', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Log audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, 'stop_impersonation', 'user', $1, $2, $3, $4)`,
      [req.user?.id, JSON.stringify({ stopped_impersonation: true }), req.ip, req.get('user-agent')]
    );

    res.json({ message: 'Impersonation stopped successfully' });
  } catch (error) {
    console.error('Stop impersonation error:', error);
    res.status(500).json({ error: 'Failed to stop impersonation' });
  }
});

// ============================================================================
// USER PREFERENCES ENDPOINTS
// ============================================================================

// Get current user's preferences
router.get('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await pool.query(
      'SELECT preferences FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Merge with defaults to ensure all preferences have values
    const userPreferences = result.rows[0].preferences || {};
    const preferences: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      ...userPreferences,
    };

    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update current user's preferences (partial or full update)
router.put('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const updates: Partial<UserPreferences> = req.body;

    // Get current preferences
    const currentResult = await pool.query(
      'SELECT preferences FROM users WHERE id = $1',
      [userId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Merge current preferences with updates
    const currentPreferences = currentResult.rows[0].preferences || {};
    const newPreferences: UserPreferences = {
      ...currentPreferences,
      ...updates,
    };

    // Update in database
    const result = await pool.query(
      `UPDATE users
       SET preferences = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING preferences`,
      [JSON.stringify(newPreferences), userId]
    );

    res.json(result.rows[0].preferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Update a single preference key (convenience endpoint)
router.patch('/preferences/:key', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { key } = req.params;
    const { value } = req.body;

    // Get current preferences
    const currentResult = await pool.query(
      'SELECT preferences FROM users WHERE id = $1',
      [userId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update single key
    const currentPreferences = currentResult.rows[0].preferences || {};
    const newPreferences = {
      ...currentPreferences,
      [key]: value,
    };

    // Update in database
    const result = await pool.query(
      `UPDATE users
       SET preferences = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING preferences`,
      [JSON.stringify(newPreferences), userId]
    );

    res.json(result.rows[0].preferences);
  } catch (error) {
    console.error('Update preference key error:', error);
    res.status(500).json({ error: 'Failed to update preference' });
  }
});

// Reset preferences to defaults
router.post('/preferences/reset', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await pool.query(
      `UPDATE users
       SET preferences = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING preferences`,
      [JSON.stringify(DEFAULT_USER_PREFERENCES), userId]
    );

    res.json(result.rows[0].preferences);
  } catch (error) {
    console.error('Reset preferences error:', error);
    res.status(500).json({ error: 'Failed to reset preferences' });
  }
});

export default router;
