import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { runMigrations } from './database/migrate';
import { seedDatabase } from './database/seed';

const PORT = process.env.PORT || 5000;
const AUTO_MIGRATE = process.env.AUTO_MIGRATE !== 'false';

async function start() {
  await runMigrations();

  try {
    await seedDatabase();
  } catch (e: any) {
    console.warn('Seeding skipped:', e.message);
  }

  app.listen(PORT, () => {
    console.log(`BUBAPC Family Connect API running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
