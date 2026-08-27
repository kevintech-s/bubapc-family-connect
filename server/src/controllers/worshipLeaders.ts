import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getWorshipLeaders(req: AuthRequest, res: Response) {
  try {
    const result = await query(
      'SELECT * FROM worship_leaders ORDER BY is_active DESC, name ASC'
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get worship leaders error:', error);
    res.status(500).json({ error: 'Failed to fetch worship leaders' });
  }
}

export async function createWorshipLeader(req: AuthRequest, res: Response) {
  try {
    const { name, role, profile_photo, start_date, end_date } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      `INSERT INTO worship_leaders (name, role, profile_photo, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, role || 'Worship Leader', profile_photo || '', start_date || new Date().toISOString().split('T')[0], end_date || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create worship leader error:', error);
    res.status(500).json({ error: 'Failed to create worship leader' });
  }
}

export async function updateWorshipLeader(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, role, profile_photo, is_active, start_date, end_date } = req.body;

    const result = await query(
      `UPDATE worship_leaders SET
        name = COALESCE($1, name),
        role = COALESCE($2, role),
        profile_photo = COALESCE($3, profile_photo),
        is_active = COALESCE($4, is_active),
        start_date = COALESCE($5, start_date),
        end_date = $6,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [name, role, profile_photo, is_active, start_date, end_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Worship leader not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update worship leader error:', error);
    res.status(500).json({ error: 'Failed to update worship leader' });
  }
}

export async function deleteWorshipLeader(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM worship_leaders WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Worship leader not found' });
    }

    res.json({ message: 'Worship leader deleted successfully' });
  } catch (error: any) {
    console.error('Delete worship leader error:', error);
    res.status(500).json({ error: 'Failed to delete worship leader' });
  }
}
