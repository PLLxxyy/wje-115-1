import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../index';
import db from '../db';
import { JWT_SECRET } from '../middleware/auth';

function createUser(username: string, email: string): { id: number; token: string } {
  const hash = bcrypt.hashSync('testpass123', 10);
  const result = db
    .prepare('INSERT INTO users (username, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)')
    .run(username, email, hash, 'user', '13900000000');
  const userId = result.lastInsertRowid as number;
  const token = jwt.sign({ userId, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
  return { id: userId, token };
}

function createEvent(): { id: number; projectId: number; fee: number } {
  const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const ev = db
    .prepare(
      'INSERT INTO events (name, city, date, fee, status, registration_deadline) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run('测试马拉松', '北京', futureDate.toISOString().split('T')[0], 200, 'upcoming', deadline.toISOString().split('T')[0]);
  const eventId = ev.lastInsertRowid as number;
  const pr = db
    .prepare('INSERT INTO event_projects (event_id, name, distance, max_participants, current_count) VALUES (?, ?, ?, ?, ?)')
    .run(eventId, 'full', 42.195, 100, 10);
  return { id: eventId, projectId: pr.lastInsertRowid as number, fee: 200 };
}

async function registerViaApi(
  token: string,
  eventId: number,
  projectId: number,
  opts: { paid?: boolean } = {}
): Promise<number> {
  const res = await request(app)
    .post('/api/registrations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      event_id: eventId,
      project_id: projectId,
      emergency_contact: '张三',
      emergency_phone: '13800000000',
    });
  expect(res.status).toBe(201);
  const regId = res.body.data.id as number;
  if (opts.paid) {
    const payRes = await request(app)
      .post(`/api/registrations/${regId}/pay`)
      .set('Authorization', `Bearer ${token}`);
    expect(payRes.status).toBe(200);
  }
  return regId;
}

function getProjectCount(projectId: number): number {
  const row = db.prepare('SELECT current_count FROM event_projects WHERE id = ?').get(projectId) as { current_count: number };
  return row.current_count;
}

function getPaymentStatus(regId: number): string {
  const row = db.prepare('SELECT payment_status FROM registrations WHERE id = ?').get(regId) as { payment_status: string };
  return row.payment_status;
}

describe('取消报名接口 DELETE /api/registrations/:id', () => {
  let user: { id: number; token: string };
  let event: { id: number; projectId: number; fee: number };

  beforeEach(() => {
    user = createUser('testuser', 'test@example.com');
    event = createEvent();
  });

  describe('场景1: 已支付取消（标记退款）', () => {
    it('应将 payment_status 改为 refunded，返回 refunded=true 和费用，并释放名额', async () => {
      const regId = await registerViaApi(user.token, event.id, event.projectId, { paid: true });
      const beforeCount = getProjectCount(event.projectId);

      const res = await request(app)
        .delete(`/api/registrations/${regId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.refunded).toBe(true);
      expect(res.body.data.fee).toBe(200);
      expect(res.body.data.message).toContain('退款');
      expect(getPaymentStatus(regId)).toBe('refunded');
      expect(getProjectCount(event.projectId)).toBe(beforeCount - 1);
    });
  });

  describe('场景2: 未支付（pending）取消', () => {
    it('应将 payment_status 改为 refunded，返回 refunded=false，并释放名额', async () => {
      const regId = await registerViaApi(user.token, event.id, event.projectId);
      const beforeCount = getProjectCount(event.projectId);

      const res = await request(app)
        .delete(`/api/registrations/${regId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.refunded).toBe(false);
      expect(res.body.data.fee).toBeUndefined();
      expect(getPaymentStatus(regId)).toBe('refunded');
      expect(getProjectCount(event.projectId)).toBe(beforeCount - 1);
    });
  });

  describe('场景3: 重复取消', () => {
    it('第二次取消应返回 400 错误且不再次扣减名额', async () => {
      const regId = await registerViaApi(user.token, event.id, event.projectId, { paid: true });
      const beforeCount = getProjectCount(event.projectId);

      const first = await request(app)
        .delete(`/api/registrations/${regId}`)
        .set('Authorization', `Bearer ${user.token}`);
      expect(first.status).toBe(200);
      const afterFirstCount = getProjectCount(event.projectId);
      expect(afterFirstCount).toBe(beforeCount - 1);

      const second = await request(app)
        .delete(`/api/registrations/${regId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(second.status).toBe(400);
      expect(second.body.error).toBeDefined();
      expect(getProjectCount(event.projectId)).toBe(afterFirstCount);
    });
  });

  describe('场景4: 取消后允许重新报名', () => {
    it('取消原报名后重新 POST /registrations 应成功创建新记录，并重新占用名额', async () => {
      const regId = await registerViaApi(user.token, event.id, event.projectId);
      const afterFirstRegCount = getProjectCount(event.projectId);

      const cancelRes = await request(app)
        .delete(`/api/registrations/${regId}`)
        .set('Authorization', `Bearer ${user.token}`);
      expect(cancelRes.status).toBe(200);
      expect(getProjectCount(event.projectId)).toBe(afterFirstRegCount - 1);

      const reRegRes = await request(app)
        .post('/api/registrations')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          event_id: event.id,
          project_id: event.projectId,
          emergency_contact: '李四',
          emergency_phone: '13700000000',
        });

      expect(reRegRes.status).toBe(201);
      expect(reRegRes.body.data.id).not.toBe(regId);
      expect(getProjectCount(event.projectId)).toBe(afterFirstRegCount);
    });
  });

  describe('场景5: 名额变化验证（多人+取消组合）', () => {
    it('两个用户分别报名，其中一人取消，名额数应等于初始值+1', async () => {
      const user2 = createUser('testuser2', 'test2@example.com');
      const initialCount = getProjectCount(event.projectId);

      await registerViaApi(user.token, event.id, event.projectId, { paid: true });
      expect(getProjectCount(event.projectId)).toBe(initialCount + 1);

      const reg2 = await registerViaApi(user2.token, event.id, event.projectId);
      expect(getProjectCount(event.projectId)).toBe(initialCount + 2);

      const myRes = await request(app)
        .get('/api/registrations/my')
        .set('Authorization', `Bearer ${user.token}`);
      const reg1Id = myRes.body.data[0].id as number;

      const cancel = await request(app)
        .delete(`/api/registrations/${reg1Id}`)
        .set('Authorization', `Bearer ${user.token}`);
      expect(cancel.status).toBe(200);
      expect(getProjectCount(event.projectId)).toBe(initialCount + 1);

      expect(getPaymentStatus(reg2)).toBe('pending');
    });
  });

  describe('场景6: 越权和校验分支', () => {
    it('其他用户的报名记录应返回 404', async () => {
      const user2 = createUser('other', 'other@example.com');
      const regId = await registerViaApi(user.token, event.id, event.projectId, { paid: true });
      const beforeCount = getProjectCount(event.projectId);

      const res = await request(app)
        .delete(`/api/registrations/${regId}`)
        .set('Authorization', `Bearer ${user2.token}`);

      expect(res.status).toBe(404);
      expect(getPaymentStatus(regId)).toBe('paid');
      expect(getProjectCount(event.projectId)).toBe(beforeCount);
    });

    it('赛事状态非 upcoming 时应返回 400', async () => {
      const regId = await registerViaApi(user.token, event.id, event.projectId, { paid: true });
      db.prepare("UPDATE events SET status = 'finished' WHERE id = ?").run(event.id);

      const res = await request(app)
        .delete(`/api/registrations/${regId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(400);
      expect(getPaymentStatus(regId)).toBe('paid');
    });

    it('未登录应返回 401', async () => {
      const regId = await registerViaApi(user.token, event.id, event.projectId, { paid: true });
      const res = await request(app).delete(`/api/registrations/${regId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('场景7: /api/registrations/my 返回的数据结构', () => {
    it('取消报名后记录仍存在于 my 列表中，但 payment_status 为 refunded', async () => {
      const regId = await registerViaApi(user.token, event.id, event.projectId, { paid: true });
      await request(app)
        .delete(`/api/registrations/${regId}`)
        .set('Authorization', `Bearer ${user.token}`);

      const res = await request(app)
        .get('/api/registrations/my')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].payment_status).toBe('refunded');
      expect(res.body.data[0].event_name).toBeDefined();
      expect(res.body.data[0].project_name).toBeDefined();
    });
  });
});
