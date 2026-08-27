import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getAnnouncements(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    let sql = `
      SELECT a.*, u.name as author_name, f.name as family_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN families f ON a.family_id = f.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (familyIds.length > 0) {
        conditions.push(`(a.scope = 'global' OR (a.scope = 'family' AND a.family_id IN (${familyIds.join(',')})))`);
      } else {
        conditions.push(`a.scope = 'global'`);
      }
    } else if (role === 'member') {
      const memberResult = await query('SELECT family_id FROM members WHERE user_id = $1', [userId]);
      if (memberResult.rows.length > 0) {
        const fid = memberResult.rows[0].family_id;
        conditions.push(`(a.scope = 'global' OR (a.scope = 'family' AND a.family_id = ${fid}))`);
      } else {
        conditions.push(`a.scope = 'global'`);
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY a.is_important DESC, a.published_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}

export async function getAnnouncementById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.*, u.name as author_name, f.name as family_name
       FROM announcements a
       LEFT JOIN users u ON a.author_id = u.id
       LEFT JOIN families f ON a.family_id = f.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get announcement error:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
}

export async function createAnnouncement(req: AuthRequest, res: Response) {
  try {
    const { title, content, is_important, image_url, scope, family_id } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const result = await query(
      `INSERT INTO announcements (title, content, is_important, image_url, scope, family_id, author_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, content, is_important || false, image_url || '', scope || 'global', family_id || null, req.user?.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
}

export async function updateAnnouncement(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { title, content, is_important, image_url } = req.body;

    const result = await query(
      `UPDATE announcements SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        is_important = COALESCE($3, is_important),
        image_url = COALESCE($4, image_url),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [title, content, is_important, image_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
}

export async function deleteAnnouncement(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error: any) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
}
