import { Router } from 'express';
import { Log } from '../logging_middleware';
import {
  fetchFromExternalApi,
  getNotifications,
  markAsRead,
  getPriorityInbox,
  syncNotifications,
} from './service';

const router = Router();

// GET /api/notifications
// query: limit, page, type OR notification_type (Event|Result|Placement), source (local|api)
router.get('/notifications', async (req: any, res: any) => {
  try {
    await Log('backend', 'info', 'route', 'GET /api/notifications');

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    // accept both ?type= and ?notification_type= from the frontend
    const type = (req.query.type || req.query.notification_type) as string | undefined;
    const source = (req.query.source as string) || 'local';

    if (source === 'api') {
      const params: Record<string, any> = { limit, page };
      if (type) params.notification_type = type;
      const notifications = await fetchFromExternalApi(params);
      await Log('backend', 'debug', 'handler', `external API returned ${notifications.length} notifications`);
      return res.json({ notifications, source: 'api', page, limit });
    }

    const offset = (page - 1) * limit;
    const notifications = await getNotifications({ limit, offset, type });
    await Log('backend', 'debug', 'handler', `db returned ${notifications.length} notifications`);
    return res.json({ notifications, source: 'local', page, limit });
  } catch (err: any) {
    await Log('backend', 'error', 'handler', `GET /notifications error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/priority?top=10
router.get('/notifications/priority', async (req: any, res: any) => {
  try {
    await Log('backend', 'info', 'route', 'GET /api/notifications/priority');
    const topN = Math.min(Number(req.query.top) || 10, 50);
    const notifications = await getPriorityInbox(topN);
    return res.json({ notifications, top: topN });
  } catch (err: any) {
    await Log('backend', 'error', 'handler', `GET /notifications/priority error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/notifications/:id/read', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await Log('backend', 'info', 'route', `PATCH /api/notifications/${id}/read`);
    const updated = await markAsRead(id);
    if (!updated) return res.status(404).json({ error: 'notification not found' });
    return res.json({ notification: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/sync
router.post('/sync', async (_req: any, res: any) => {
  try {
    await Log('backend', 'info', 'route', 'POST /api/sync');
    const { synced } = await syncNotifications();
    return res.json({ ok: true, synced });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
