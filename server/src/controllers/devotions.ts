import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getDevotions(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    const { family_id } = req.query;

    let familyWhere = '';
    let filterIds: number[] = [];

    if (role === 'family_leader') {
      const families = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      filterIds = families.rows.map((r: any) => r.id);
    } else if (role === 'member') {
      const m = await query('SELECT family_id FROM members WHERE user_id = $1', [userId]);
      filterIds = m.rows.map((r: any) => r.family_id);
    }

    if (family_id) {
      familyWhere = `d.family_id = ${Number(family_id)}`;
    } else if (role === 'family_leader' || role === 'member') {
      if (filterIds.length === 0) return res.json([]);
      familyWhere = `d.family_id IN (${filterIds.join(',')})`;
    }

    const sql = `SELECT d.*, u.name as author_name
       FROM devotions d
       LEFT JOIN users u ON d.author_id = u.id
       ${familyWhere ? 'WHERE ' + familyWhere : ''}
       ORDER BY d.created_at DESC`;

    const result = await query(sql);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get devotions error:', error);
    res.status(500).json({ error: 'Failed to fetch devotions' });
  }
}

export async function createDevotion(req: AuthRequest, res: Response) {
  try {
    const { family_id, title, content, scripture } = req.body;
    if (!family_id || !title || !content) {
      return res.status(400).json({ error: 'Family, title, and content are required' });
    }
    const result = await query(
      `INSERT INTO devotions (family_id, title, content, scripture, author_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [family_id, title, content, scripture || '', req.user?.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create devotion error:', error);
    res.status(500).json({ error: 'Failed to create devotion' });
  }
}

export async function updateDevotion(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { title, content, scripture } = req.body;
    const result = await query(
      `UPDATE devotions SET
         title = COALESCE($1, title),
         content = COALESCE($2, content),
         scripture = COALESCE($3, scripture),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [title, content, scripture, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Devotion not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update devotion error:', error);
    res.status(500).json({ error: 'Failed to update devotion' });
  }
}

export async function deleteDevotion(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM devotions WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Devotion not found' });
    res.json({ message: 'Devotion deleted' });
  } catch (error: any) {
    console.error('Delete devotion error:', error);
    res.status(500).json({ error: 'Failed to delete devotion' });
  }
}
