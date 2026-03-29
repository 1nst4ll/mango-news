/**
 * Database-based Cron Job Locking
 *
 * Replaces process-local boolean locks with database rows so that
 * locks survive restarts and prevent overlap across multiple instances.
 * Stale locks older than LOCK_TIMEOUT_MS are automatically cleaned up.
 */

const { pool } = require('./db');

const LOCK_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours — treat as stale

/**
 * Attempt to acquire a named lock.
 * Returns true if lock was acquired, false if already held.
 */
async function acquireLock(lockName) {
  try {
    // Clean up stale locks first
    await pool.query(
      `DELETE FROM application_settings
       WHERE setting_name = $1
         AND setting_value::bigint < $2`,
      [lockName, Date.now() - LOCK_TIMEOUT_MS]
    );

    // Try to insert the lock row (fails silently if already exists)
    const result = await pool.query(
      `INSERT INTO application_settings (setting_name, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_name) DO NOTHING
       RETURNING setting_name`,
      [lockName, String(Date.now())]
    );

    return result.rowCount > 0;
  } catch (err) {
    console.error(`[CronLock] Error acquiring lock "${lockName}":`, err.message);
    return false;
  }
}

/**
 * Release a named lock.
 */
async function releaseLock(lockName) {
  try {
    await pool.query(
      `DELETE FROM application_settings WHERE setting_name = $1`,
      [lockName]
    );
  } catch (err) {
    console.error(`[CronLock] Error releasing lock "${lockName}":`, err.message);
  }
}

/**
 * Check if any cron job lock is currently held (for monitoring).
 */
async function getActiveLocks() {
  try {
    const result = await pool.query(
      `SELECT setting_name, setting_value FROM application_settings
       WHERE setting_name IN ('lock_main_scraper', 'lock_missing_ai', 'lock_sunday_edition')`
    );
    return result.rows.map(row => ({
      name: row.setting_name,
      acquiredAt: new Date(parseInt(row.setting_value)),
    }));
  } catch (err) {
    return [];
  }
}

module.exports = { acquireLock, releaseLock, getActiveLocks };
