import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function jwtSecret() {
  return process.env.JWT_SECRET || 'fallback-secret';
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, profile_photo',
      [email, passwordHash, name, 'member']
    );

    const user = result.rows[0];

    await query(
      `INSERT INTO members (user_id, full_name, email)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id`,
      [user.id, name, email]
    );

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, jwtSecret(), { expiresIn: JWT_EXPIRES_IN as any });

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, profile_photo: user.profile_photo || '' }, token });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated. Contact an administrator.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      jwtSecret(),
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, profile_photo: user.profile_photo || '' },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await query(
      'SELECT id, email, name, role, is_active, profile_photo, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
}

export async function getUsers(_req: AuthRequest, res: Response) {
  try {
    const result = await query(
      'SELECT id, email, name, role, is_active, profile_photo, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['member', 'family_leader', 'family_coordinator', 'pastor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (parseInt(id) === req.user?.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const result = await query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, is_active, profile_photo, created_at',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    if (parseInt(id) === req.user?.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, is_active, profile_photo, created_at',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, email, profile_photo } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (profile_photo !== undefined) {
      updates.push(`profile_photo = $${paramIndex++}`);
      values.push(profile_photo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, role, is_active, profile_photo, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email is already in use' });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

export async function uploadProfilePhoto(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const url = `/uploads/${file.filename}`;
    const result = await query(
      `UPDATE users SET profile_photo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, is_active, profile_photo, created_at, updated_at`,
      [url, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ error: 'Failed to upload profile photo' });
  }
}
