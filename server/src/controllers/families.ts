import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getFamilies(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    let sql = `SELECT f.*,
       COUNT(m.id) as member_count,
       lm.name as leader_male_name,
       lf.name as leader_female_name
       FROM families f
       LEFT JOIN members m ON m.family_id = f.id AND m.is_active = true
       LEFT JOIN users lm ON f.leader_male_id = lm.id
       LEFT JOIN users lf ON f.leader_female_id = lf.id`;

    if (role === 'family_leader') {
      sql += ` WHERE f.leader_male_id = ${userId} OR f.leader_female_id = ${userId}`;
    }

    sql += ` GROUP BY f.id, lm.name, lf.name ORDER BY f.name ASC`;

    const result = await query(sql);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get families error:', error);
    res.status(500).json({ error: 'Failed to fetch families' });
  }
}

export async function getFamilyById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    const userId = req.user?.id;

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (!familyIds.includes(Number(id))) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const familyResult = await query(
      `SELECT f.*, lm.name as leader_male_name, lf.name as leader_female_name
       FROM families f
       LEFT JOIN users lm ON f.leader_male_id = lm.id
       LEFT JOIN users lf ON f.leader_female_id = lf.id
       WHERE f.id = $1`,
      [id]
    );

    if (familyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const membersResult = await query(
      `SELECT id, full_name, email, phone, profile_photo, gender, role_in_family, date_joined
       FROM members WHERE family_id = $1 AND is_active = true ORDER BY full_name`,
      [id]
    );

    res.json({ ...familyResult.rows[0], members: membersResult.rows });
  } catch (error: any) {
    console.error('Get family error:', error);
    res.status(500).json({ error: 'Failed to fetch family' });
  }
}

export async function createFamily(req: AuthRequest, res: Response) {
  try {
    const { name, description, contact_email, contact_phone, address, leader_male_id, leader_female_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Family name is required' });
    }

    const result = await query(
      `INSERT INTO families (name, description, contact_email, contact_phone, address, leader_male_id, leader_female_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description || '', contact_email || '', contact_phone || '', address || '', leader_male_id || null, leader_female_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create family error:', error);
    res.status(500).json({ error: 'Failed to create family' });
  }
}

export async function updateFamily(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, contact_email, contact_phone, address, leader_male_id, leader_female_id } = req.body;
    const role = req.user?.role;
    const userId = req.user?.id;
    const bodyHasLeader = (k: string) => Object.prototype.hasOwnProperty.call(req.body, k);

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (!familyIds.includes(Number(id))) {
        return res.status(403).json({ error: 'You can only update your own family' });
      }
    }

    const hasMale = bodyHasLeader('leader_male_id');
    const hasFemale = bodyHasLeader('leader_female_id');
    const setClause = [
      'name = COALESCE($1, name)',
      'description = COALESCE($2, description)',
      'contact_email = COALESCE($3, contact_email)',
      'contact_phone = COALESCE($4, contact_phone)',
      'address = COALESCE($5, address)',
    ];
    const params: any[] = [name, description, contact_email, contact_phone, address];
    if (hasMale) { params.push(leader_male_id); setClause.push(`leader_male_id = $${params.length}`); }
    if (hasFemale) { params.push(leader_female_id); setClause.push(`leader_female_id = $${params.length}`); }
    params.push(id);

    const result = await query(
      `UPDATE families SET ${setClause.join(', ')}
       WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update family error:', error);
    res.status(500).json({ error: 'Failed to update family' });
  }
}

export async function deleteFamily(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM families WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }

    res.json({ message: 'Family deleted successfully' });
  } catch (error: any) {
    console.error('Delete family error:', error);
    res.status(500).json({ error: 'Failed to delete family' });
  }
}
