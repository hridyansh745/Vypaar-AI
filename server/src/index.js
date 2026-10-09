import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config.js';
import { connectDb } from './db.js';
import { apiLimiter, errorHandler, loadSession } from './middleware.js';
import authRouter from './routes/auth.js';
import businessRouter from './routes/business.js';
import aiRouter from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false, // built client is served with its own hashed assets
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '4mb' })); // allows optional profile photo data-urls
app.use(cookieParser());
app.use(loadSession);

/* ------------------------------ API routes -------------------------------- */

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/config', (_req, res) => {
  res.json({
    demoMode: config.demoMode,
    otp: config.providers.otp,
    sms: config.providers.sms,
    email: config.providers.email,
    map: config.providers.map,
    verification: config.providers.verification,
    storage: config.providers.storage,
    ai: { configured: config.providers.ai.configured, provider: config.providers.ai.provider || null },
    languages: ['en', 'hi', 'bho', 'awa', 'ur'],
  });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/business', businessRouter);
app.use('/api/ai', aiRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'not_found', message: 'Not found' } }));

/* --------------------------- static client -------------------------------- */

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: 'index.html', maxAge: '1h' }));
  // SPA fallback (React Router owns all non-API paths)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

/* -------------------------------- start ----------------------------------- */

const port = config.port;
connectDb().finally(() => {
  app.listen(port, () => {
    console.log(`[vyaparai] API listening on http://localhost:${port}`);
    console.log(`[vyaparai] Mode: ${config.demoMode ? 'DEMO (simulated OTP/verification)' : 'LIVE providers'}`);
    console.log(`[vyaparai] Storage: ${config.mongoUri ? 'MongoDB' : 'in-memory (demo)'}`);
  });
});
