import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getPhotos(req: AuthRequest, res: Response) {
  try {
    const { category, family_id } = req.query;
    const role = req.user?.role;
    const userId = req.user?.id;
    let sql = `SELECT p.*, u.name as uploaded_by_name, f.name as family_name
               FROM photos p
               LEFT JOIN users u ON p.uploaded_by = u.id
               LEFT JOIN families f ON p.family_id = f.id`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }
    if (family_id) {
      params.push(family_id);
      conditions.push(`p.family_id = $${params.length}`);
    }

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (familyIds.length > 0) {
        conditions.push(`(p.family_id IN (${familyIds.join(',')}) OR p.family_id IS NULL)`);
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY p.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
}

export async function createPhoto(req: AuthRequest, res: Response) {
  try {
    let { caption, category, family_id } = req.body;
    const file = req.file;
    const role = req.user?.role;
    const userId = req.user?.id;

    if (!file) {
      return res.status(400).json({ error: 'Photo file is required' });
    }

    if (role === 'family_leader') {
      if (!family_id) {
        return res.status(400).json({ error: 'Family is required for family leader uploads' });
      }
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (!familyIds.includes(Number(family_id))) {
        return res.status(403).json({ error: 'You can only upload photos to your own family gallery' });
      }
      family_id = Number(family_id);
    }

    const url = `/uploads/${file.filename}`;

    const result = await query(
      `INSERT INTO photos (url, caption, category, family_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [url, caption || '', category || 'General', family_id || null, req.user?.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
}

export async function deletePhoto(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    const userId = req.user?.id;

    const photoResult = await query('SELECT url, family_id FROM photos WHERE id = $1', [id]);

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (role === 'family_leader') {
      const leaderFamilies = await query(
        'SELECT id FROM families WHERE leader_male_id = $1 OR leader_female_id = $1',
        [userId]
      );
      const familyIds = leaderFamilies.rows.map((r: any) => r.id);
      if (!familyIds.includes(Number(photoResult.rows[0].family_id))) {
        return res.status(403).json({ error: 'You can only delete photos from your own family gallery' });
      }
    }

    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../..', photoResult.rows[0].url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await query('DELETE FROM photos WHERE id = $1', [id]);
    res.json({ message: 'Photo deleted successfully' });
  } catch (error: any) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
}
