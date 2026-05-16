import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Log } from '../logging_middleware';
import router from './routes';
import { ensureDemoStudent, startNotificationPoller } from './service';
import { initDb } from './db';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', router);

app.get('/health', (_req: any, res: any) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// generic error handler
app.use((err: Error, _req: any, res: any, _next: any) => {
  Log('backend', 'error', 'middleware', `unhandled error: ${err.message}`);
  res.status(500).json({ error: 'something went wrong' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  Log('backend', 'info', 'handler', 'websocket client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'connected to notification stream' }));

  ws.on('close', () => {
    Log('backend', 'info', 'handler', 'websocket client disconnected');
  });

  ws.on('error', (err: Error) => {
    Log('backend', 'error', 'handler', `websocket error: ${err.message}`);
  });
});

async function bootstrap() {
  await Log('backend', 'info', 'config', 'starting server bootstrap');

  await initDb();
  await Log('backend', 'info', 'db', 'database connection ok');

  await ensureDemoStudent();

  startNotificationPoller((notification: any) => {
    const payload = JSON.stringify({ type: 'new_notification', data: notification });
    let pushed = 0;

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
        pushed++;
      }
    });

    if (pushed > 0) {
      Log('backend', 'info', 'handler', `pushed new notification to ${pushed} ws client(s)`);
    }
  });

  server.listen(PORT, () => {
    Log('backend', 'info', 'config', `server listening on port ${PORT}`);
    console.log(`server running at http://localhost:${PORT}`);
  });
}

bootstrap().catch((err: Error) => {
  console.error('bootstrap failed:', err);
  Log('backend', 'fatal', 'config', `bootstrap failed: ${err.message}`);
  process.exit(1);
});

export default app;
