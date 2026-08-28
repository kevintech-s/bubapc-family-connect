import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getWorshipLeaders(req: AuthRequest, res: Response) {
  try {
    const { family_id, service_date } = req.query;
    const role = req.user?.role;
    const userId = req.user?.id;

    let sql = `SELECT wl.*, f.name as family_name
               FROM worship_leaders wl
               LEFT JOIN families f ON wl.family_id = f.id`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (family_id) {
      params.push(family_id);
      conditions.push(`wl.family_id = $${params.length}`);
    }
    if (service_date) {
      params.push(service_date);
      conditions.push(`wl.service_date = $${params.length}`);
    }

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (familyIds.length > 0) {
        conditions.push(`wl.family_id IN (${familyIds.join(',')})`);
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY wl.is_active DESC, wl.name ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get worship leaders error:', error);
    res.status(500).json({ error: 'Failed to fetch worship leaders' });
  }
}

export async function createWorshipLeader(req: AuthRequest, res: Response) {
  try {
    let { name, role, profile_photo, start_date, end_date, family_id, service_date } = req.body;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (userRole === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (family_id && family_id !== 'null' && !familyIds.includes(Number(family_id))) {
        return res.status(403).json({ error: 'You can only manage worship leaders for your own family' });
      }
      family_id = familyIds.length > 0 ? familyIds[0] : null;
    }

    const result = await query(
      `INSERT INTO worship_leaders (name, role, profile_photo, start_date, end_date, family_id, service_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, role || 'Worship Leader', profile_photo || '', start_date || new Date().toISOString().split('T')[0], end_date || null, family_id || null, service_date || null]
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
    let { name, role, profile_photo, is_active, start_date, end_date, family_id, service_date } = req.body;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const existing = await query('SELECT * FROM worship_leaders WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Worship leader not found' });
    }

    if (userRole === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      const targetFamilyId = family_id || existing.rows[0].family_id;
      if (!familyIds.includes(Number(targetFamilyId))) {
        return res.status(403).json({ error: 'You can only manage worship leaders for your own family' });
      }
      family_id = familyIds.length > 0 ? familyIds[0] : null;
    }

    const result = await query(
      `UPDATE worship_leaders SET
        name = COALESCE($1, name),
        role = COALESCE($2, role),
        profile_photo = COALESCE($3, profile_photo),
        is_active = COALESCE($4, is_active),
        start_date = COALESCE($5, start_date),
        end_date = $6,
        family_id = COALESCE($7, family_id),
        service_date = COALESCE($8, service_date),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [name, role, profile_photo, is_active, start_date, end_date, family_id, service_date, id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update worship leader error:', error);
    res.status(500).json({ error: 'Failed to update worship leader' });
  }
}

export async function deleteWorshipLeader(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const existing = await query('SELECT * FROM worship_leaders WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Worship leader not found' });
    }

    if (userRole === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (!familyIds.includes(Number(existing.rows[0].family_id))) {
        return res.status(403).json({ error: 'You can only manage worship leaders for your own family' });
      }
    }

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
