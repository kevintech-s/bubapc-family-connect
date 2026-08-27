import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getCancellations(_req: AuthRequest, res: Response) {
  try {
    const result = await query(
      `SELECT fc.*, u.name as cancelled_by_name
       FROM friday_cancellations fc
       LEFT JOIN users u ON fc.cancelled_by = u.id
       ORDER BY fc.cancellation_date DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get cancellations error:', error);
    res.status(500).json({ error: 'Failed to fetch cancellations' });
  }
}

export async function getUpcomingCancellation(_req: AuthRequest, res: Response) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT fc.*, u.name as cancelled_by_name
       FROM friday_cancellations fc
       LEFT JOIN users u ON fc.cancelled_by = u.id
       WHERE fc.cancellation_date >= $1
       ORDER BY fc.cancellation_date ASC
       LIMIT 1`,
      [today]
    );
    res.json(result.rows[0] || null);
  } catch (error: any) {
    console.error('Get upcoming cancellation error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming cancellation' });
  }
}

export async function createCancellation(req: AuthRequest, res: Response) {
  try {
    const { cancellation_date, reason } = req.body;

    if (!cancellation_date || !reason) {
      return res.status(400).json({ error: 'Date and reason are required' });
    }

    const result = await query(
      `INSERT INTO friday_cancellations (cancellation_date, reason, cancelled_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [cancellation_date, reason, req.user?.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create cancellation error:', error);
    res.status(500).json({ error: 'Failed to create cancellation' });
  }
}

export async function deleteCancellation(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM friday_cancellations WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cancellation not found' });
    }

    res.json({ message: 'Cancellation removed' });
  } catch (error: any) {
    console.error('Delete cancellation error:', error);
    res.status(500).json({ error: 'Failed to delete cancellation' });
  }
}
