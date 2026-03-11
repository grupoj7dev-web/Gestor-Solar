const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
let resetPromise = null;

function getSqliteDbPath() {
  const rawUrl = String(process.env.DATABASE_URL || '').trim();
  if (!rawUrl.startsWith('file:')) return null;
  const fileRef = rawUrl.slice('file:'.length);
  if (!fileRef) return null;
  return path.resolve(process.cwd(), fileRef);
}

function isSqliteCorruptionError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('database disk image is malformed')
    || message.includes('sqlite_corrupt')
    || message.includes('raw query failed. code: `11`');
}

async function resetSqliteDatabaseOnCorruption(reason = 'unknown') {
  if (resetPromise) return resetPromise;

  resetPromise = (async () => {
    const dbPath = getSqliteDbPath();
    if (!dbPath) {
      throw new Error('DATABASE_URL is not a sqlite file path');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseBackupPath = `${dbPath}.corrupted-${timestamp}`;
    const sidecars = ['-wal', '-shm', '-journal'];

    console.error(`[DB Recovery] SQLite corruption detected (${reason}). Resetting database at ${dbPath}`);

    try {
      await prisma.$disconnect();
    } catch (_) {
      // Ignore disconnect failures during recovery.
    }

    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    if (fs.existsSync(dbPath)) {
      fs.renameSync(dbPath, baseBackupPath);
    }

    for (const suffix of sidecars) {
      const sidecarPath = `${dbPath}${suffix}`;
      if (fs.existsSync(sidecarPath)) {
        fs.renameSync(sidecarPath, `${baseBackupPath}${suffix}`);
      }
    }

    // Create a fresh sqlite file. Tables are lazily recreated by the app.
    fs.closeSync(fs.openSync(dbPath, 'w'));

    return {
      dbPath,
      backupPath: baseBackupPath,
    };
  })();

  try {
    return await resetPromise;
  } finally {
    resetPromise = null;
  }
}

prisma.isSqliteCorruptionError = isSqliteCorruptionError;
prisma.resetSqliteDatabaseOnCorruption = resetSqliteDatabaseOnCorruption;
prisma.getSqliteDbPath = getSqliteDbPath;

module.exports = prisma;
