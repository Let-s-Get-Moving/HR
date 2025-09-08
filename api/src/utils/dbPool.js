// Database connection pool management

import pkg from 'pg';
const { Pool } = pkg;

class DatabasePool {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  // Initialize connection pool
  initialize() {
    if (this.pool) {
      return this.pool;
    }

    const config = {
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum number of clients in the pool
      min: 5,  // Minimum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      this.isConnected = false;
    });

    // Test connection
    this.testConnection();

    return this.pool;
  }

  // Test database connection
  async testConnection() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      this.isConnected = false;
    }
  }

  // Get connection from pool
  async getConnection() {
    if (!this.pool) {
      this.initialize();
    }
    return await this.pool.connect();
  }

  // Execute query with connection management
  async query(text, params = []) {
    if (!this.pool) {
      this.initialize();
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected: ${duration}ms`, { text: text.substring(0, 100) });
      }
      
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Execute transaction
  async transaction(callback) {
    const client = await this.getConnection();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get pool status
  getStatus() {
    if (!this.pool) {
      return { connected: false, totalCount: 0, idleCount: 0, waitingCount: 0 };
    }

    return {
      connected: this.isConnected,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  // Close pool
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('Database pool closed');
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        pool: this.getStatus(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        pool: this.getStatus(),
      };
    }
  }
}

// Create singleton instance
const dbPool = new DatabasePool();

// Initialize on import
dbPool.initialize();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down database pool...');
  await dbPool.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down database pool...');
  await dbPool.close();
  process.exit(0);
});

export default dbPool;
