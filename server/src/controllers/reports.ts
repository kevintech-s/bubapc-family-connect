import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'word';
  return '';
}

export async function getReports(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    let sql = `
      SELECT r.*, f.name as family_name, u.name as author_name
      FROM reports r
      LEFT JOIN families f ON r.family_id = f.id
      LEFT JOIN users u ON r.author_id = u.id
    `;
    const conditions: string[] = [];

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (familyIds.length > 0) {
        conditions.push(`r.audience = 'coordinator' AND r.family_id IN (${familyIds.join(',')})`);
      } else {
        conditions.push(`r.audience = 'coordinator' AND r.family_id = -1`);
      }
    } else if (role === 'family_coordinator') {
      conditions.push(`(r.audience = 'coordinator' OR (r.audience = 'pastor' AND r.author_id = ${userId}))`);
    } else if (role === 'pastor') {
      conditions.push(`r.audience = 'pastor'`);
    } else {
      return res.json([]);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY r.created_at DESC';

    const result = await query(sql);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

export async function uploadReport(req: AuthRequest, res: Response) {
  try {
    let { audience, family_id, title } = req.body;
    const file = req.file;
    const role = req.user?.role;
    const userId = req.user?.id;

    if (!file) {
      return res.status(400).json({ error: 'Report file is required' });
    }
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (role === 'family_leader') {
      audience = 'coordinator';
      if (!family_id) {
        return res.status(400).json({ error: 'Family is required' });
      }
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (!familyIds.includes(Number(family_id))) {
        return res.status(403).json({ error: 'You can only submit reports for your own family' });
      }
      family_id = Number(family_id);
    } else if (role === 'family_coordinator') {
      audience = 'pastor';
      family_id = family_id || null;
    } else {
      return res.status(403).json({ error: 'You are not allowed to upload reports' });
    }

    const file_type = getFileType(file.originalname);
    const file_url = `/uploads/${file.filename}`;

    const result = await query(
      `INSERT INTO reports (family_id, title, file_url, file_type, author_id, audience)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [family_id, title, file_url, file_type, userId, audience]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Upload report error:', error);
    res.status(500).json({ error: 'Failed to upload report' });
  }
}

export async function deleteReport(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    const userId = req.user?.id;

    const existing = await query('SELECT * FROM reports WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = existing.rows[0];
    if (report.author_id !== userId && role !== 'pastor') {
      return res.status(403).json({ error: 'You can only delete your own reports' });
    }

    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../..', report.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await query('DELETE FROM reports WHERE id = $1', [id]);
    res.json({ message: 'Report deleted successfully' });
  } catch (error: any) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
}
