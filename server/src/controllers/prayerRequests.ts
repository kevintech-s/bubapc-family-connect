import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getPrayerRequests(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    let sql = `
      SELECT pr.*, m.full_name as member_name, m.gender as member_gender, m.family_id,
             f.name as family_name, fb.name as forwarded_by_name
      FROM prayer_requests pr
      LEFT JOIN members m ON pr.member_id = m.id
      LEFT JOIN families f ON m.family_id = f.id
      LEFT JOIN users fb ON pr.forwarded_by = fb.id
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
        conditions.push(`m.family_id IN (${familyIds.join(',')})`);
      } else {
        return res.json([]);
      }
    } else if (role === 'family_coordinator') {
      conditions.push(`pr.forwarded_to_pastor = true`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    if (role === 'member') {
      return res.json([]);
    }
    sql += ' ORDER BY pr.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get prayer requests error:', error);
    res.status(500).json({ error: 'Failed to fetch prayer requests' });
  }
}

export async function createPrayerRequest(req: AuthRequest, res: Response) {
  try {
    const { title, description, category, member_id } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const result = await query(
      `INSERT INTO prayer_requests (title, description, category, member_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, description, category || 'General', member_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create prayer request error:', error);
    res.status(500).json({ error: 'Failed to create prayer request' });
  }
}

export async function forwardPrayerRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    const pr = await query('SELECT * FROM prayer_requests WHERE id = $1', [id]);
    if (pr.rows.length === 0) {
      return res.status(404).json({ error: 'Prayer request not found' });
    }

    if (role === 'family_leader') {
      const memberResult = await query('SELECT family_id FROM members WHERE id = $1', [pr.rows[0].member_id]);
      if (memberResult.rows.length === 0) {
        return res.status(403).json({ error: 'You can only forward prayer requests from your own family' });
      }
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (!familyIds.includes(memberResult.rows[0].family_id)) {
        return res.status(403).json({ error: 'You can only forward prayer requests from your own family' });
      }
    }

    const result = await query(
      `UPDATE prayer_requests SET forwarded_to_pastor = true, forwarded_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [userId, id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Forward prayer request error:', error);
    res.status(500).json({ error: 'Failed to forward prayer request' });
  }
}

export async function updatePrayerRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'addressed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (pending, addressed, resolved)' });
    }

    const result = await query(
      `UPDATE prayer_requests SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prayer request not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update prayer request error:', error);
    res.status(500).json({ error: 'Failed to update prayer request' });
  }
}

export async function deletePrayerRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM prayer_requests WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prayer request not found' });
    }

    res.json({ message: 'Prayer request deleted successfully' });
  } catch (error: any) {
    console.error('Delete prayer request error:', error);
    res.status(500).json({ error: 'Failed to delete prayer request' });
  }
}
