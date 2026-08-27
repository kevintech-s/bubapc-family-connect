import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    let familiesWhere = '';
    let membersWhere = 'WHERE m.is_active = true';
    let prayerWhere = '';
    const params: any[] = [];

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (familyIds.length > 0) {
        familiesWhere = `WHERE f.id IN (${familyIds.join(',')})`;
        membersWhere = `WHERE m.is_active = true AND m.family_id IN (${familyIds.join(',')})`;
        prayerWhere = `WHERE m.family_id IN (${familyIds.join(',')})`;
      } else {
        return res.json({
          stats: { totalFamilies: 0, totalMembers: 0 },
          recentAnnouncements: [],
          recentPrayerRequests: [],
          activeWorshipLeaders: [],
          recentPhotos: [],
          birthdays: [],
          upcomingCancellation: null,
        });
      }
    }

    const familyCountSql = `SELECT COUNT(*) as count FROM families f ${familiesWhere}`;
    const memberCountSql = `SELECT COUNT(*) as count FROM members m ${membersWhere}`;
    const prayerSql = `SELECT pr.*, m.full_name as member_name, m.family_id, f.name as family_name
      FROM prayer_requests pr
      LEFT JOIN members m ON pr.member_id = m.id
      LEFT JOIN families f ON m.family_id = f.id
      ${prayerWhere}
      ORDER BY pr.created_at DESC LIMIT 5`;

    const today = new Date().toISOString().split('T')[0];

    const [familiesCount, membersCount, announcementsResult, prayerRequestsResult, worshipLeadersResult, recentPhotosResult, birthdays, upcomingCancellation, attendanceStats] = await Promise.all([
      query(familyCountSql),
      query(memberCountSql),
      query(`SELECT a.*, u.name as author_name FROM announcements a LEFT JOIN users u ON a.author_id = u.id WHERE a.scope = 'global' ORDER BY a.is_important DESC, a.published_at DESC LIMIT 5`),
      query(prayerSql),
      query('SELECT * FROM worship_leaders WHERE is_active = true ORDER BY name'),
      query('SELECT * FROM photos ORDER BY created_at DESC LIMIT 6'),
      query(`SELECT m.*, f.name as family_name FROM members m LEFT JOIN families f ON m.family_id = f.id WHERE m.is_active = true AND m.birthday IS NOT NULL ORDER BY EXTRACT(MONTH FROM m.birthday), EXTRACT(DAY FROM m.birthday) LIMIT 10`),
      query(`SELECT fc.*, u.name as cancelled_by_name FROM friday_cancellations fc LEFT JOIN users u ON fc.cancelled_by = u.id WHERE fc.cancellation_date >= $1 ORDER BY fc.cancellation_date ASC LIMIT 1`, [today]),
      query(`SELECT a.service_date, COUNT(*) as present_count
             FROM attendance a
             WHERE a.service_date = $1
             GROUP BY a.service_date`, [today]),
    ]);

    res.json({
      stats: {
        totalFamilies: parseInt(familiesCount.rows[0].count),
        totalMembers: parseInt(membersCount.rows[0].count),
      },
      recentAnnouncements: announcementsResult.rows,
      recentPrayerRequests: prayerRequestsResult.rows,
      activeWorshipLeaders: worshipLeadersResult.rows,
      recentPhotos: recentPhotosResult.rows,
      birthdays: birthdays.rows,
      upcomingCancellation: upcomingCancellation.rows[0] || null,
      todayAttendance: attendanceStats.rows[0] || { service_date: today, present_count: 0 },
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
