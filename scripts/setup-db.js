const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(rootDir, 'apps/api');

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db'
};

console.log('[setup-db] Running prisma db push...');
try {
  execSync('npx prisma db push --skip-generate', { cwd: apiDir, stdio: 'inherit', env });
  console.log('[setup-db] Prisma schema synchronized successfully.');
} catch (err) {
  console.error('[setup-db] prisma db push failed:', err.message);
  process.exit(1);
}

console.log('[setup-db] Running seed script...');
try {
  execSync('npx tsx prisma/seed.ts', { cwd: apiDir, stdio: 'inherit', env });
  console.log('[setup-db] Seed completed successfully.');
} catch (err) {
  console.warn('[setup-db] Seed warning (can continue):', err.message);
}
