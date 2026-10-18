import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { fail } from './utils/http';
import { authRouter } from './modules/auth/routes';
import { userRouter } from './modules/users/routes';
import { vehicleRouter } from './modules/vehicles/routes';
import { tripRouter } from './modules/trips/routes';
import { attendanceRouter } from './modules/attendance/routes';
import { maintenanceRouter } from './modules/maintenance/routes';
import { fuelRouter } from './modules/fuel/routes';
import { expenseRouter } from './modules/expenses/routes';
import { dashboardRouter } from './modules/dashboard/routes';
import { trackingRouter } from './modules/tracking/routes';
import { analyticsRouter } from './modules/analytics/routes';
import { aiRouter } from './modules/ai/routes';
import { chatRouter } from './modules/chat/routes';
import { ocrRouter } from './modules/ocr/routes';
import { notificationRouter } from './modules/notifications/routes';
import { locationRouter } from './modules/locations/routes';
import { alertRouter } from './modules/alerts/routes';
import { organizationRouter } from './modules/organizations/routes';
import { adminRouter } from './modules/admin/routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'test' ? 'tiny' : 'dev'));

app.get('/health', (_req, res) => res.json({ success: true, service: 'LogiSphere AI Backend' }));
app.use('/api/org', organizationRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use(['/api/user', '/api/users'], userRouter);
app.use(['/api/vehicle', '/api/vehicles'], vehicleRouter);
app.use(['/api/trip', '/api/trips'], tripRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/fuel', fuelRouter);
app.use('/api/expenses', expenseRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/chat', chatRouter);
app.use('/api/ocr', ocrRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/locations', locationRouter);
app.use('/api/v1/locations', locationRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/sos', alertRouter);

app.all(['/ws/chat', '/chat', '/ws', '/api/chat/ws', '/ws/tracking', '/tracking', '/api/tracking/ws', '/ws/alerts', '/alerts', '/api/alerts/ws'], (_req, res) => {
  return res.status(426).json({
    success: false,
    upgradeRequired: true,
    message: 'Upgrade Required: Please connect using WebSocket protocol (ws:// or wss://)',
  });
});

app.use((_req, res) => fail(res, 404, 'Route not found'));
