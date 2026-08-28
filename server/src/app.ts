import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import familyRoutes from './routes/families';
import memberRoutes from './routes/members';
import announcementRoutes from './routes/announcements';
import prayerRequestRoutes from './routes/prayerRequests';
import worshipLeaderRoutes from './routes/worshipLeaders';
import photoRoutes from './routes/photos';
import dashboardRoutes from './routes/dashboard';
import fridayCancellationRoutes from './routes/fridayCancellations';
import attendanceRoutes from './routes/attendance';
import reportRoutes from './routes/reports';
import { errorHandler } from './middleware/errorHandler';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : '*',
  credentials: process.env.NODE_ENV === 'production',
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/prayer-requests', prayerRequestRoutes);
app.use('/api/worship-leaders', worshipLeaderRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/friday-cancellations', fridayCancellationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const candidateDirs = [
  path.join(__dirname, '..', '..', 'client', 'dist'),
  path.join(__dirname, '..', 'dist', 'client'),
  path.join(process.cwd(), 'client', 'dist'),
  path.join(process.cwd(), 'public'),
];
const clientDist = candidateDirs.find((dir) => fs.existsSync(path.join(dir, 'index.html')));
if (clientDist) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

export default app;
