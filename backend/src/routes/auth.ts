import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  authenticate,
  AuthRequest,
} from '../middleware/auth';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, first_name, last_name, department, title } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Get default role (staff)
    const defaultRole = await pool.query("SELECT id FROM roles WHERE name = 'staff' LIMIT 1");
    const role_id = defaultRole.rows[0]?.id || null;

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, department, title, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, department, title, created_at`,
      [email.toLowerCase(), password_hash, first_name, last_name, department, title, role_id]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken, req.ip, req.get('user-agent')]
    );

    // Log audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, details, ip_address, user_agent)
       VALUES ($1, 'register', $2, $3, $4)`,
      [user.id, JSON.stringify({ email: user.email }), req.ip, req.get('user-agent')]
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department,
        title: user.title,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Fetch user with role and permissions
    const result = await pool.query(
      `SELECT u.*, r.name as role_name, r.display_name as role_display_name, r.permissions
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken, req.ip, req.get('user-agent')]
    );

    // Update last login
    await pool.query(
      `UPDATE users SET last_login = NOW(), login_count = login_count + 1 WHERE id = $1`,
      [user.id]
    );

    // Log audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, details, ip_address, user_agent)
       VALUES ($1, 'login', $2, $3, $4)`,
      [user.id, JSON.stringify({ email: user.email }), req.ip, req.get('user-agent')]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department,
        title: user.title,
        role: user.role_name,
        role_display_name: user.role_display_name,
        permissions: user.permissions || ['view_public'],
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if refresh token exists in database
    const sessionResult = await pool.query(
      'SELECT user_id FROM user_sessions WHERE refresh_token = $1 AND expires_at > NOW()',
      [refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token expired or not found' });
    }

    const userId = sessionResult.rows[0].user_id;

    // Generate new access token
    const accessToken = generateAccessToken(userId);

    res.json({ accessToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete refresh token from database
      await pool.query('DELETE FROM user_sessions WHERE refresh_token = $1', [refreshToken]);
    }

    // Log audit
    if (req.user) {
      await pool.query(
        `INSERT INTO audit_log (user_id, action, ip_address, user_agent)
         VALUES ($1, 'logout', $2, $3)`,
        [req.user.id, req.ip, req.get('user-agent')]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.department, u.title,
              u.avatar_url, u.preferences, u.created_at, u.last_login,
              r.name as role_name, r.display_name as role_display_name, r.permissions
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      department: user.department,
      title: user.title,
      avatar_url: user.avatar_url,
      preferences: user.preferences,
      role: user.role_name,
      role_display_name: user.role_display_name,
      permissions: user.permissions || ['view_public'],
      created_at: user.created_at,
      last_login: user.last_login,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { first_name, last_name, department, title, avatar_url, preferences } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           department = COALESCE($3, department),
           title = COALESCE($4, title),
           avatar_url = COALESCE($5, avatar_url),
           preferences = COALESCE($6, preferences),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, email, first_name, last_name, department, title, avatar_url, preferences`,
      [first_name, last_name, department, title, avatar_url, preferences ? JSON.stringify(preferences) : null, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
