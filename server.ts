import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';
import { authenticate } from './server/middleware.js';
import { schedulerService } from './server/services/schedulerService.js';

// Route imports
import authRoutes from './server/routes/authRoutes.js';
import agentRoutes from './server/routes/agentRoutes.js';
import socialRoutes from './server/routes/socialRoutes.js';
import calendarRoutes from './server/routes/calendarRoutes.js';
import postRoutes from './server/routes/postRoutes.js';
import brandRoutes from './server/routes/brandRoutes.js';
import intelligenceRoutes from './server/routes/intelligenceRoutes.js';
import billingRoutes from './server/routes/billingRoutes.js';
import supportRoutes from './server/routes/supportRoutes.js';
import notificationRoutes from './server/routes/notificationRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers with generous limit for visual assets & prompts
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Global Session Authentication
app.use(authenticate as any);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Meta Colab',
    version: '1.0.0',
    metaApiVersion: 'v21.0',
    timestamp: new Date().toISOString(),
  });
});

// Meta Platform Compliance Endpoints (Required for Meta App Review & GDPR)
// 1. Webhook Verification
app.get('/api/meta/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'metacolab_meta_webhook_secret_verify_token';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[Meta Webhook] Successfully verified handshake with Meta Graph API');
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Verification token mismatch');
});

// 2. Webhook Event Ingestion
app.post('/api/meta/webhook', (req: Request, res: Response) => {
  console.log('[Meta Webhook Event Received]:', JSON.stringify(req.body));
  res.status(200).send('EVENT_RECEIVED');
});

// 3. User Data Deletion Callback (Meta Requirement)
app.post('/api/meta/data-deletion', (req: Request, res: Response) => {
  const confirmationCode = `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const statusUrl = `${process.env.APP_URL || 'http://localhost:3000'}/data-deletion-status?code=${confirmationCode}`;

  console.log(`[Meta Data Deletion Request] Confirmation Code: ${confirmationCode}`);

  return res.json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  });
});

// 4. Deauthorization Callback (Meta Requirement)
app.post('/api/meta/deauthorize', (req: Request, res: Response) => {
  console.log('[Meta Deauthorization Received]: User disconnected Meta Colab app.');
  return res.status(200).json({ success: true });
});

// Mount Application API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/calendars', calendarRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/brand', brandRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    error: 'Une erreur interne est survenue sur le serveur.',
    message: isProduction ? undefined : err.message,
  });
});

// Start background task scheduler
schedulerService.start(20000); // Check every 20 seconds

// Mount Vite or serve static production build
async function setupViteOrStatic() {
  await db.initialize();

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  🚀 Meta Colab Full-Stack SaaS running on port ${PORT}`);
    console.log(`  Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT (Vite mounted)'}`);
    console.log(`  Mandatory Approval Rule: ACTIVE`);
    console.log(`  SuperAdmin: admin@metacolab.io`);
    console.log(`  Demo User:  demo@metacolab.io`);
    console.log(`=======================================================`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
