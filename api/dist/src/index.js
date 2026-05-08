import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from './services/storage';
import uploadsRouter from './routes/uploads';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import { validateEnv } from './validate-env';
import { runMigrations } from './db';
validateEnv();
runMigrations();
const app = new Hono();
app.use('*', logger());
app.use('*', cors({ origin: process.env.APP_URL || 'http://localhost:5173', credentials: true }));
app.route('/api/uploads', uploadsRouter);
app.route('/api/auth', authRouter);
app.route('/api/users', usersRouter);
app.get('/api/health', (c) => c.json({ ok: true }));
app.get('/uploads/*', async (c) => {
    const path = c.req.path.replace('/uploads/', '');
    const data = await serveStatic(path);
    if (!data)
        return c.text('Not found', 404);
    return c.body(data);
});
serve({
    fetch: app.fetch,
    port: parseInt(process.env.PORT || '3000'),
}, (info) => {
    console.log(`Server running on http://localhost:${info.port}`);
});
