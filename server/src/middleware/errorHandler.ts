import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this information already exists' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist' });
  }

  if (err.code === '23502') {
    return res.status(400).json({ error: 'Required field is missing' });
  }

  if (err.message && err.message.includes('File too large')) {
    return res.status(413).json({ error: 'File is too large. Maximum size is 10MB.' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}
