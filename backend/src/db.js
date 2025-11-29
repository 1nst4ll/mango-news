/**
 * Centralized Database Connection Pool
 * 
 * This module provides a single shared PostgreSQL connection pool
 * to be used across all modules. Previously, three separate pools
 * were created (index.js, scraper.js, sundayEditionGenerator.js),
 * causing connection exhaustion and memory overhead.
 * 
 * Memory Impact: Reduces connection overhead and prevents connection leaks.
 */

const { Pool } = require('pg');

// Create a single pool with optimized settings for Render's environment
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  
  // Connection pool settings optimized for memory-constrained environments
  max: 10, // Maximum number of connections in the pool (reduced from default 10 for Render)
  min: 2, // Minimum number of connections to keep open
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout for acquiring a connection
  
  // Statement timeout to prevent long-running queries
  statement_timeout: 60000, // 60 seconds
});

// Log pool events for debugging
pool.on('connect', (client) => {
  console.log(`[DB Pool] Client connected. Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

pool.on('acquire', (client) => {
  // Commented out to reduce log noise, uncomment for debugging
  // console.log(`[DB Pool] Client acquired. Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

pool.on('release', (err, client) => {
  if (err) {
    console.error('[DB Pool] Error releasing client:', err);
  }
  // Commented out to reduce log noise, uncomment for debugging
  // console.log(`[DB Pool] Client released. Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

pool.on('remove', (client) => {
  console.log(`[DB Pool] Client removed. Total: ${pool.totalCount}, Idle: ${pool.idleCount}`);
});

pool.on('error', (err, client) => {
  console.error('[DB Pool] Unexpected error on idle client:', err);
});

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log(`[DB Pool] Database connected successfully at ${result.rows[0].now}`);
    client.release();
    return true;
  } catch (err) {
    console.error('[DB Pool] Database connection failed:', err);
    return false;
  }
};

/**
 * Get pool statistics for monitoring
 */
const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

/**
 * Gracefully close all connections
 * Called during shutdown
 */
const closePool = async () => {
  console.log('[DB Pool] Closing all connections...');
  try {
    await pool.end();
    console.log('[DB Pool] All connections closed');
  } catch (err) {
    console.error('[DB Pool] Error closing pool:', err);
    throw err;
  }
};

module.exports = {
  pool,
  testConnection,
  getPoolStats,
  closePool,
};