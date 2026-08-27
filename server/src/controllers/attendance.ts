import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getAttendanceByDate(req: AuthRequest, res: Response) {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const role = req.user?.role;
    let familyWhere = '';
    const params: any[] = [date];

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [req.user?.id]
      );
      const ids = leaderFamilies.rows.map((r: any) => r.id);
      if (ids.length === 0) return res.json({ rows: [], count: 0, checkedInIds: [] });
      familyWhere = `AND m.family_id IN (${ids.join(',')})`;
    }

    const sql = `SELECT a.*, m.full_name as member_name, m.gender, f.name as family_name
      FROM attendance a
      JOIN members m ON a.member_id = m.id
      JOIN families f ON m.family_id = f.id
      WHERE a.service_date = $1 ${familyWhere}
      ORDER BY m.full_name`;

    const result = await query(sql, params);
    res.json({ rows: result.rows, count: result.rows.length, checkedInIds: result.rows.map((r: any) => r.member_id) });
  } catch (error: any) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
}

export async function getMembersByDate(req: AuthRequest, res: Response) {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const role = req.user?.role;
    let where = 'WHERE m.is_active = true';
    const params: any[] = [];

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [req.user?.id]
      );
      const ids = leaderFamilies.rows.map((r: any) => r.id);
      if (ids.length === 0) return res.json([]);
      params.push(ids);
      where = `WHERE m.is_active = true AND m.family_id = ANY($${params.length}::int[])`;
    }

    const sql = `SELECT m.*, f.name as family_name, f.id as family_id_fk
      FROM members m
      LEFT JOIN families f ON m.family_id = f.id
      ${where}
      ORDER BY m.full_name`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get members for attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}

export async function checkIn(req: AuthRequest, res: Response) {
  try {
    const { service_date, member_id, status } = req.body;
    if (!service_date || !member_id) {
      return res.status(400).json({ error: 'service_date and member_id are required' });
    }

    const member = await query('SELECT * FROM members WHERE id = $1', [member_id]);
    if (member.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const familyId = member.rows[0].family_id;
    const userId = req.user?.id;

    let result = await query(
      `INSERT INTO attendance (service_date, member_id, family_id, checked_in_by, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (service_date, member_id)
       DO UPDATE SET status = EXCLUDED.status, checked_in_by = EXCLUDED.checked_in_by
       RETURNING *`,
      [service_date, member_id, familyId, userId, status || 'present']
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Check in error:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid member or family reference' });
    }
    res.status(500).json({ error: 'Failed to check in' });
  }
}

export async function undoCheckIn(req: AuthRequest, res: Response) {
  try {
    const { service_date, member_id } = req.body;
    if (!service_date || !member_id) {
      return res.status(400).json({ error: 'service_date and member_id are required' });
    }
    await query('DELETE FROM attendance WHERE service_date = $1 AND member_id = $2', [service_date, member_id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Undo check in error:', error);
    res.status(500).json({ error: 'Failed to undo check in' });
  }
}

export async function getAttendanceStats(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role;
    let familyWhere = '';
    const params: any[] = [];
    let familyIds: number[] = [];

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [req.user?.id]
      );
      familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (familyIds.length === 0) {
        return res.json({ totalMembers: 0, recentServices: [], totalCheckIns: 0 });
      }
      params.push(familyIds);
      familyWhere = `WHERE m.family_id = ANY($${params.length}::int[])`;
    }

    const totalMembersRes = await query(
      `SELECT COUNT(*) as count FROM members m ${familyWhere}`
    );
    const totalMembers = parseInt(totalMembersRes.rows[0].count);

    const recentServicesRes = await query(
      `SELECT a.service_date,
              COUNT(DISTINCT a.member_id) as present_count,
              COUNT(*) FILTER (WHERE a.status = 'late') as late_count
       FROM attendance a
       GROUP BY a.service_date
       ORDER BY a.service_date DESC
       LIMIT 6`
    );

    let totalCheckIns = 0;
    if (role !== 'family_leader') {
      const tc = await query('SELECT COUNT(*) as count FROM attendance');
      totalCheckIns = parseInt(tc.rows[0].count);
    }

    res.json({ totalMembers, recentServices: recentServicesRes.rows, totalCheckIns });
  } catch (error: any) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance stats' });
  }
}
