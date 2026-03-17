import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDb } from './db.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5500';

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in .env file.');
  process.exit(1);
}

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const db = await initDb();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      name.trim(),
      email.toLowerCase().trim(),
      passwordHash
    );

    const user = { id: result.lastID, name: name.trim(), email: email.toLowerCase().trim() };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ message: 'Could not create account.', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await db.get('SELECT id, name, email, password_hash FROM users WHERE email = ?', email.toLowerCase());

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ user: payload, token });
  } catch (error) {
    res.status(500).json({ message: 'Could not log in.', error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', req.user.id);
  res.json({ user });
});

app.get('/api/tasks', requireAuth, async (req, res) => {
  const { status, priority, search } = req.query;

  const filters = ['user_id = ?'];
  const values = [req.user.id];

  if (status && status !== 'all') {
    filters.push('status = ?');
    values.push(status);
  }

  if (priority && priority !== 'all') {
    filters.push('priority = ?');
    values.push(priority);
  }

  if (search) {
    filters.push('(title LIKE ? OR description LIKE ?)');
    values.push(`%${search}%`, `%${search}%`);
  }

  const tasks = await db.all(
    `SELECT * FROM tasks WHERE ${filters.join(' AND ')} ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      CASE status WHEN 'in_progress' THEN 1 WHEN 'todo' THEN 2 ELSE 3 END,
      created_at DESC`,
    values
  );

  res.json({ tasks });
});

app.post('/api/tasks', requireAuth, async (req, res) => {
  const { title, description = '', status = 'todo', priority = 'medium', due_date = null } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  const result = await db.run(
    `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    req.user.id,
    title.trim(),
    description.trim(),
    status,
    priority,
    due_date || null
  );

  const task = await db.get('SELECT * FROM tasks WHERE id = ?', result.lastID);
  res.status(201).json({ task });
});

app.put('/api/tasks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, description = '', status = 'todo', priority = 'medium', due_date = null } = req.body;

  const existingTask = await db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', id, req.user.id);
  if (!existingTask) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  if (!title?.trim()) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  await db.run(
    `UPDATE tasks
     SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    title.trim(),
    description.trim(),
    status,
    priority,
    due_date || null,
    id,
    req.user.id
  );

  const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  res.json({ task });
});

app.patch('/api/tasks/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowed = ['todo', 'in_progress', 'done'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  const existingTask = await db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', id, req.user.id);
  if (!existingTask) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  await db.run(
    `UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    status,
    id,
    req.user.id
  );

  const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  res.json({ task });
});

app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const result = await db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  res.status(204).send();
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
