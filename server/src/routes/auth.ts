import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import { JWT_SECRET, AuthRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, phone } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      res.status(400).json({ error: '用户名或邮箱已存在' });
      return;
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, phone) VALUES (?, ?, ?, ?)'
    ).run(username, email, password_hash, phone || '');

    const token = jwt.sign({ userId: result.lastInsertRowid, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      data: {
        token,
        user: { id: result.lastInsertRowid, username, email, role: 'user', phone: phone || '' }
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '注册失败';
    res.status(500).json({ error: message });
  }
});

router.post('/login', (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码为必填项' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as Record<string, unknown> | undefined;
    if (!user) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const valid = bcrypt.compareSync(password, user.password_hash as string);
    if (!valid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          phone: user.phone
        }
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '登录失败';
    res.status(500).json({ error: message });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, phone, created_at FROM users WHERE id = ?').get(req.userId!) as Record<string, unknown> | undefined;
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json({ data: user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取用户信息失败';
    res.status(500).json({ error: message });
  }
});

export default router;
