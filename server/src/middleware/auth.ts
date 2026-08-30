import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    name: string;
  };
}

export interface JWTPayload {
  id: number;
  email: string;
  role: string;
  name: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const ROLE_HIERARCHY: Record<string, number> = {
  'member': 0,
  'family_leader': 1,
  'family_coordinator': 2,
  'pastor': 3,
};

export function authorize(...roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (req.user.role === 'family_leader') {
      try {
        const check = await query(
          'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1 LIMIT 1',
          [req.user.id]
        );
        if (check.rows.length === 0) {
          return res.status(403).json({
            error: 'You are not assigned to any family yet. Ask the pastor to assign you as the male (Paapa) or female (Maama) leader of your family.',
          });
        }
      } catch (error) {
        console.error('leader family check error:', error);
        return res.status(500).json({ error: 'Failed to verify family assignment' });
      }
    }

    next();
  };
}

export function authorizeMinRole(minRole: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (req.user.role === 'family_leader') {
      try {
        const check = await query(
          'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1 LIMIT 1',
          [req.user.id]
        );
        if (check.rows.length === 0) {
          return res.status(403).json({
            error: 'You are not assigned to any family yet. Ask the pastor to assign you as the male (Paapa) or female (Maama) leader of your family.',
          });
        }
      } catch (error) {
        console.error('leader family check error:', error);
        return res.status(500).json({ error: 'Failed to verify family assignment' });
      }
    }

    next();
  };
}

export { ROLE_HIERARCHY };
