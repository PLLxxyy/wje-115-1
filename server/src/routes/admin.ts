import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// Create event
router.post('/events', (req: AuthRequest, res: Response) => {
  try {
    const { name, city, date, route_description, start_point, end_point, cutoff_time, fee, supplies, status, image_url, registration_deadline, projects } = req.body;

    if (!name || !city || !date || !registration_deadline) {
      res.status(400).json({ error: '赛事名称、城市、日期和报名截止日期为必填项' });
      return;
    }

    const result = db.prepare(`
      INSERT INTO events (name, city, date, route_description, start_point, end_point, cutoff_time, fee, supplies, status, image_url, registration_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, city, date,
      route_description || '', start_point || '', end_point || '',
      cutoff_time || '', fee || 0, supplies || '',
      status || 'upcoming', image_url || '', registration_deadline
    );

    const eventId = result.lastInsertRowid;

    if (projects && Array.isArray(projects)) {
      const insertProject = db.prepare(`
        INSERT INTO event_projects (event_id, name, distance, max_participants, current_count)
        VALUES (?, ?, ?, ?, 0)
      `);
      for (const p of projects) {
        insertProject.run(eventId, p.name, p.distance, p.max_participants);
      }
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    const eventProjects = db.prepare('SELECT * FROM event_projects WHERE event_id = ?').all(eventId);

    res.status(201).json({ data: { ...event as Record<string, unknown>, projects: eventProjects } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '创建赛事失败';
    res.status(500).json({ error: message });
  }
});

// Update event
router.put('/events/:id', (req: AuthRequest, res: Response) => {
  try {
    const { name, city, date, route_description, start_point, end_point, cutoff_time, fee, supplies, status, image_url, registration_deadline } = req.body;

    const existing = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: '赛事不存在' });
      return;
    }

    db.prepare(`
      UPDATE events SET name = ?, city = ?, date = ?, route_description = ?, start_point = ?,
      end_point = ?, cutoff_time = ?, fee = ?, supplies = ?, status = ?, image_url = ?, registration_deadline = ?
      WHERE id = ?
    `).run(
      name, city, date, route_description, start_point, end_point,
      cutoff_time, fee, supplies, status, image_url, registration_deadline,
      req.params.id
    );

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    res.json({ data: event });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新赛事失败';
    res.status(500).json({ error: message });
  }
});

// Delete event
router.delete('/events/:id', (req: AuthRequest, res: Response) => {
  try {
    const existing = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: '赛事不存在' });
      return;
    }

    db.prepare('DELETE FROM registrations WHERE event_id = ?').run(req.params.id);
    db.prepare('DELETE FROM event_projects WHERE event_id = ?').run(req.params.id);
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);

    res.json({ data: { message: '删除成功' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '删除赛事失败';
    res.status(500).json({ error: message });
  }
});

// Get registrations for an event
router.get('/events/:id/registrations', (req: AuthRequest, res: Response) => {
  try {
    const registrations = db.prepare(`
      SELECT r.*, u.username, u.email, u.phone as user_phone, ep.name as project_name, ep.distance
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN event_projects ep ON r.project_id = ep.id
      WHERE r.event_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.id);

    res.json({ data: registrations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取报名列表失败';
    res.status(500).json({ error: message });
  }
});

// Dashboard stats
router.get('/stats', (_req: AuthRequest, res: Response) => {
  try {
    const totalEvents = (db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number }).count;
    const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get() as { count: number }).count;
    const totalRegistrations = (db.prepare('SELECT COUNT(*) as count FROM registrations').get() as { count: number }).count;
    const paidRegistrations = (db.prepare("SELECT COUNT(*) as count FROM registrations WHERE payment_status = 'paid'").get() as { count: number }).count;

    const eventsWithStats = db.prepare(`
      SELECT e.id, e.name, e.city, e.date, e.status,
        (SELECT COUNT(*) FROM registrations WHERE event_id = e.id) as registration_count,
        (SELECT COUNT(*) FROM registrations WHERE event_id = e.id AND payment_status = 'paid') as paid_count
      FROM events e ORDER BY e.date DESC
    `).all();

    res.json({
      data: {
        totalEvents,
        totalUsers,
        totalRegistrations,
        paidRegistrations,
        events: eventsWithStats
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取统计数据失败';
    res.status(500).json({ error: message });
  }
});

// Export registrations as CSV data
router.get('/events/:id/export', (req: AuthRequest, res: Response) => {
  try {
    const registrations = db.prepare(`
      SELECT r.bib_number, u.username, u.email, u.phone, ep.name as project_name, ep.distance,
             r.emergency_contact, r.emergency_phone, r.payment_status, r.finish_time
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN event_projects ep ON r.project_id = ep.id
      WHERE r.event_id = ?
      ORDER BY r.bib_number
    `).all(req.params.id);

    res.json({ data: registrations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '导出失败';
    res.status(500).json({ error: message });
  }
});

export default router;
