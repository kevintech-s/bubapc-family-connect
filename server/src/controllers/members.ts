import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getMembers(req: AuthRequest, res: Response) {
  try {
    const { family_id } = req.query;
    const role = req.user?.role;
    const userId = req.user?.id;

    let sql = `SELECT m.*, f.name as family_name
               FROM members m
               LEFT JOIN families f ON m.family_id = f.id`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (family_id) {
      params.push(family_id);
      conditions.push(`m.family_id = $${params.length}`);
    } else if (role === 'family_leader') {
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
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY m.full_name ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}

export async function getMemberById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    const userId = req.user?.id;

    const result = await query(
      `SELECT m.*, f.name as family_name
       FROM members m
       LEFT JOIN families f ON m.family_id = f.id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = result.rows[0];

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (!familyIds.includes(member.family_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(member);
  } catch (error: any) {
    console.error('Get member error:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
}

export async function createMember(req: AuthRequest, res: Response) {
  try {
    const { full_name, email, phone, family_id, role_in_family, date_joined, gender, birthday } = req.body;
    const role = req.user?.role;
    const userId = req.user?.id;

    if (!full_name || !email || !family_id) {
      return res.status(400).json({ error: 'Full name, email, and family are required' });
    }

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (!familyIds.includes(Number(family_id))) {
        return res.status(403).json({ error: 'You can only add members to your own family' });
      }
    }

    const existingMember = await query(
      'SELECT id FROM members WHERE email = $1 AND family_id = $2',
      [email, family_id]
    );
    if (existingMember.rows.length > 0) {
      return res.status(409).json({ error: 'This member already belongs to this family' });
    }

    const existingAnyFamily = await query(
      'SELECT id, family_id FROM members WHERE email = $1',
      [email]
    );
    if (existingAnyFamily.rows.length > 0) {
      return res.status(400).json({ error: 'A member with this email already belongs to a family' });
    }

    const result = await query(
      `INSERT INTO members (full_name, email, phone, family_id, role_in_family, date_joined, gender, birthday)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [full_name, email, phone || '', family_id, role_in_family || 'Member', date_joined || new Date().toISOString().split('T')[0], gender || '', birthday || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create member error:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
}

export async function updateMember(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { full_name, email, phone, family_id, role_in_family, is_active, profile_photo, gender, birthday } = req.body;
    const role = req.user?.role;
    const userId = req.user?.id;

    if (role === 'family_leader') {
      const target = await query('SELECT family_id FROM members WHERE id = $1', [id]);
      if (target.rows.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      const targetFamilyId = family_id || target.rows[0].family_id;
      if (!familyIds.includes(Number(targetFamilyId))) {
        return res.status(403).json({ error: 'You can only update members in your own family' });
      }
    }

    if (family_id && email) {
      const conflict = await query(
        'SELECT id FROM members WHERE email = $1 AND family_id = $2 AND id <> $3',
        [email, family_id, id]
      );
      if (conflict.rows.length > 0) {
        return res.status(400).json({ error: 'A member with this email already belongs to a family' });
      }
    } else if (email) {
      const conflict = await query(
        'SELECT id FROM members WHERE LOWER(email) = LOWER($1) AND id <> $2',
        [email, id]
      );
      if (conflict.rows.length > 0) {
        return res.status(400).json({ error: 'A member with this email already belongs to a family' });
      }
    }

    const result = await query(
      `UPDATE members SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        family_id = COALESCE($4, family_id),
        role_in_family = COALESCE($5, role_in_family),
        is_active = COALESCE($6, is_active),
        profile_photo = COALESCE($7, profile_photo),
        gender = COALESCE($8, gender),
        birthday = COALESCE($9, birthday),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [full_name, email, phone, family_id, role_in_family, is_active, profile_photo, gender, birthday, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
}

export async function deleteMember(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM members WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ message: 'Member deleted successfully' });
  } catch (error: any) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
}

export async function getBirthdays(_req: AuthRequest, res: Response) {
  try {
    const result = await query(
      `SELECT m.*, f.name as family_name
       FROM members m
       LEFT JOIN families f ON m.family_id = f.id
       WHERE m.is_active = true AND m.birthday IS NOT NULL
       ORDER BY EXTRACT(MONTH FROM m.birthday), EXTRACT(DAY FROM m.birthday)`
    );

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const upcoming = result.rows.filter((m: any) => {
      const bday = new Date(m.birthday);
      const bMonth = bday.getMonth() + 1;
      const bDay = bday.getDate();
      const diffDays = ((bMonth * 30 + bDay) - (todayMonth * 30 + todayDay) + 365) % 365;
      return diffDays <= 30;
    });

    res.json(upcoming);
  } catch (error: any) {
    console.error('Get birthdays error:', error);
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
}
