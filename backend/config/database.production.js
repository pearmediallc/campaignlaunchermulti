require('dotenv').config();

/**
 * Production Database Configuration
 *
 * Optimized for Render PostgreSQL with connection pooling and recovery handling.
 *
 * Key settings:
 * - Pool max: 10 (reduced from 20 to prevent connection exhaustion)
 * - Acquire timeout: 60s (time to wait for connection)
 * - Idle timeout: 10s (return idle connections to pool)
 * - Evict: 30s (check for stale connections)
 * - Retry: Built-in via Sequelize retry options
 */

const poolConfig = {
  max: 10,           // Reduced from 20 - prevents connection exhaustion
  min: 1,            // Reduced from 2 - fewer idle connections
  acquire: 60000,    // 60s to acquire connection
  idle: 10000,       // 10s idle timeout
  evict: 30000       // 30s eviction check
};

const retryConfig = {
  max: 5,            // Max retry attempts for failed operations
  backoffBase: 1000, // Start with 1s delay
  backoffExponent: 1.5 // Exponential backoff
};

// Check if DATABASE_URL is provided (by Render's PostgreSQL)
if (process.env.DATABASE_URL) {
  module.exports = {
    production: {
      use_env_variable: 'DATABASE_URL',
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
        // Connection timeout for initial connection
        connectionTimeoutMillis: 30000,
        // Statement timeout to prevent long-running queries
        statement_timeout: 60000
      },
      logging: false,
      pool: poolConfig,
      retry: retryConfig
    }
  };
} else {
  // Fallback to individual database credentials if DATABASE_URL is not set
  console.log('WARNING: DATABASE_URL not found, using individual database credentials');
  module.exports = {
    production: {
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fb_campaign_launcher',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false,
        connectionTimeoutMillis: 30000,
        statement_timeout: 60000
      },
      logging: false,
      pool: poolConfig,
      retry: retryConfig
    }
  };
}