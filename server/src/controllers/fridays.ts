import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getFridayQuestion(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    const { family_id } = req.query;

    if (!family_id) {
      return res.status(400).json({ error: 'family_id is required' });
    }

    const questionResult = await query(
      `SELECT q.*, u.name as created_by_name
       FROM friday_questions q
       LEFT JOIN users u ON q.created_by = u.id
       WHERE q.family_id = $1 AND q.service_date = CURRENT_DATE
       ORDER BY q.created_at DESC LIMIT 1`,
      [Number(family_id)]
    );
    const question = questionResult.rows[0] || null;
    if (!question) return res.json(null);

    if (['family_leader', 'pastor', 'family_coordinator'].includes(role || '')) {
      const answers = await query(
        `SELECT a.id, a.answer, a.created_at, m.full_name as member_name
         FROM friday_answers a
         JOIN members m ON a.member_id = m.id
         WHERE a.question_id = $1
         ORDER BY a.created_at ASC`,
        [question.id]
      );
      return res.json({ ...question, answers: answers.rows, role });
    }

    const member = await query('SELECT id FROM members WHERE user_id = $1', [userId]);
    const memberId = member.rows[0]?.id || null;
    let myAnswer = null;
    if (memberId) {
      const mine = await query(
        'SELECT answer FROM friday_answers WHERE question_id = $1 AND member_id = $2',
        [question.id, memberId]
      );
      myAnswer = mine.rows[0]?.answer || null;
    }
    res.json({ ...question, my_answer: myAnswer, role });
  } catch (error: any) {
    console.error('Get Friday question error:', error);
    res.status(500).json({ error: 'Failed to fetch Friday question' });
  }
}

export async function createFridayQuestion(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role;
    if (!['pastor', 'family_coordinator', 'family_leader'].includes(role || '')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { family_id, question, service_date } = req.body;
    if (!family_id || !question) {
      return res.status(400).json({ error: 'Family and question are required' });
    }
    const result = await query(
      `INSERT INTO friday_questions (family_id, service_date, question, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [family_id, service_date || new Date().toISOString().slice(0, 10), question, req.user?.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create Friday question error:', error);
    res.status(500).json({ error: 'Failed to create Friday question' });
  }
}

export async function answerFridayQuestion(req: AuthRequest, res: Response) {
  try {
    const { id: question_id } = req.params;
    const { answer } = req.body;
    const userId = req.user?.id;
    if (!answer) return res.status(400).json({ error: 'Answer is required' });

    const member = await query('SELECT id, family_id FROM members WHERE user_id = $1', [userId]);
    if (member.rows.length === 0) {
      return res.status(403).json({ error: 'No member profile found' });
    }
    const memberId = member.rows[0].id;
    const memberFamily = member.rows[0].family_id;

    const q = await query('SELECT family_id FROM friday_questions WHERE id = $1', [question_id]);
    if (q.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
    if (q.rows[0].family_id !== memberFamily) {
      return res.status(403).json({ error: 'Not your family question' });
    }

    const result = await query(
      `INSERT INTO friday_answers (question_id, member_id, answer)
       VALUES ($1, $2, $3)
       ON CONFLICT (question_id, member_id)
       DO UPDATE SET answer = EXCLUDED.answer, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [question_id, memberId, answer]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Answer Friday question error:', error);
    res.status(500).json({ error: 'Failed to save answer' });
  }
}
