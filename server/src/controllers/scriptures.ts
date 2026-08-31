import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getScriptureOfDay(req: AuthRequest, res: Response) {
  try {
    const { date } = req.query;
    const day = date || new Date().toISOString().slice(0, 10);
    const result = await query(
      'SELECT * FROM daily_scriptures WHERE scripture_date = $1',
      [day]
    );
    res.json(result.rows[0] || null);
  } catch (error: any) {
    console.error('Get scripture error:', error);
    res.status(500).json({ error: 'Failed to fetch scripture' });
  }
}

export async function setScriptureOfDay(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!['pastor', 'family_coordinator'].includes(role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { scripture_date, content, reference } = req.body;
    if (!scripture_date || !content) {
      return res.status(400).json({ error: 'Date and content are required' });
    }
    const result = await query(
      `INSERT INTO daily_scriptures (scripture_date, content, reference)
       VALUES ($1, $2, $3)
       ON CONFLICT (scripture_date)
       DO UPDATE SET content = EXCLUDED.content, reference = EXCLUDED.reference
       RETURNING *`,
      [scripture_date, content, reference || '']
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Set scripture error:', error);
    res.status(500).json({ error: 'Failed to set scripture' });
  }
}
