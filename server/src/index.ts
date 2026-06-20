import * as dotenv from 'dotenv';
dotenv.config();

// Fail fast on missing secrets so misconfiguration is obvious
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('❌ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in .env');
  process.exit(1);
}

import app from './app';
import { prisma } from './db/prisma';

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, () => {
  console.log(`🚀 Tripzy API running on http://localhost:${PORT}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
