import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { event_id, project_id, emergency_contact, emergency_phone } = req.body;

    if (!event_id || !project_id || !emergency_contact || !emergency_phone) {
      res.status(400).json({ error: '请填写完整的报名信息' });
      return;
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id) as Record<string, unknown> | undefined;
    if (!event) {
      res.status(404).json({ error: '赛事不存在' });
      return;
    }

    if (event.status !== 'upcoming') {
      res.status(400).json({ error: '该赛事不在报名期' });
      return;
    }

    const deadline = new Date(event.registration_deadline as string);
    if (new Date() > deadline) {
      res.status(400).json({ error: '报名已截止' });
      return;
    }

    const project = db.prepare('SELECT * FROM event_projects WHERE id = ? AND event_id = ?').get(project_id, event_id) as Record<string, unknown> | undefined;
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    if ((project.current_count as number) >= (project.max_participants as number)) {
      res.status(400).json({ error: '该项目名额已满' });
      return;
    }

    const existingReg = db.prepare(
      'SELECT id FROM registrations WHERE user_id = ? AND event_id = ?'
    ).get(req.userId!, event_id);
    if (existingReg) {
      res.status(400).json({ error: '您已报名该赛事' });
      return;
    }

    const bibNumber = generateBibNumber(event_id as number, project.name as string);

    const result = db.prepare(`
      INSERT INTO registrations (user_id, event_id, project_id, emergency_contact, emergency_phone, bib_number, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(req.userId!, event_id, project_id, emergency_contact, emergency_phone, bibNumber);

    db.prepare('UPDATE event_projects SET current_count = current_count + 1 WHERE id = ?').run(project_id);

    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ data: registration });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '报名失败';
    res.status(500).json({ error: message });
  }
});

router.get('/my', (req: AuthRequest, res: Response) => {
  try {
    const registrations = db.prepare(`
      SELECT r.*, e.name as event_name, e.city, e.date as event_date, e.status as event_status,
             ep.name as project_name, ep.distance
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN event_projects ep ON r.project_id = ep.id
      WHERE r.user_id = ?
      ORDER BY e.date DESC
    `).all(req.userId!);

    res.json({ data: registrations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取报名记录失败';
    res.status(500).json({ error: message });
  }
});

router.post('/:id/pay', (req: AuthRequest, res: Response) => {
  try {
    const reg = db.prepare('SELECT * FROM registrations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as Record<string, unknown> | undefined;
    if (!reg) {
      res.status(404).json({ error: '报名记录不存在' });
      return;
    }

    if (reg.payment_status === 'paid') {
      res.status(400).json({ error: '已支付，无需重复支付' });
      return;
    }

    db.prepare("UPDATE registrations SET payment_status = 'paid' WHERE id = ?").run(req.params.id);

    res.json({ data: { message: '支付成功' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '支付失败';
    res.status(500).json({ error: message });
  }
});

router.post('/:id/certificate', (req: AuthRequest, res: Response) => {
  try {
    const { certificate_url, finish_time } = req.body;
    const reg = db.prepare('SELECT * FROM registrations WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as Record<string, unknown> | undefined;

    if (!reg) {
      res.status(404).json({ error: '报名记录不存在' });
      return;
    }

    db.prepare('UPDATE registrations SET certificate_url = ?, finish_time = ? WHERE id = ?')
      .run(certificate_url || '', finish_time || '', req.params.id);

    res.json({ data: { message: '上传成功' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '上传失败';
    res.status(500).json({ error: message });
  }
});

function generateBibNumber(eventId: number, projectName: string): string {
  const prefix = projectName === 'full' ? 'F' : projectName === 'half' ? 'H' : 'K';
  const count = db.prepare(
    'SELECT COUNT(*) as count FROM registrations WHERE event_id = ?'
  ).get(eventId) as { count: number };
  return `${prefix}${String(eventId).padStart(2, '0')}${String(count.count + 1).padStart(5, '0')}`;
}

export default router;
