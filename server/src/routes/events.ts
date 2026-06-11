import { Router, Response } from 'express';
import db from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', (_req: AuthRequest, res: Response) => {
  try {
    const events = db.prepare(`
      SELECT * FROM events ORDER BY date ASC
    `).all();
    res.json({ data: events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取赛事列表失败';
    res.status(500).json({ error: message });
  }
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!event) {
      res.status(404).json({ error: '赛事不存在' });
      return;
    }

    const projects = db.prepare(
      'SELECT * FROM event_projects WHERE event_id = ?'
    ).all(req.params.id);

    res.json({ data: { ...event, projects } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取赛事详情失败';
    res.status(500).json({ error: message });
  }
});

export default router;
