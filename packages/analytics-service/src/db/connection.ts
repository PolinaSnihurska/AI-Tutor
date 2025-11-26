import { Pool, PoolClient, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Optimized connection pool configuration for analytics
const poolConfig: PoolConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ai_tutor',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  
  // Connection pool settings (larger for analytics workload)
  max: parseInt(process.env.DB_POOL_MAX || '30'), // Larger pool for analytics
  min: parseInt(process.env.DB_POOL_MIN || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  
  // Performance optimizations
  statement_timeout: 60000, // 60 second timeout for complex analytics queries
  query_timeout: 60000,
  
  // Keep-alive settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

export const closePool = async () => {
  await pool.end();
};

export default pool;
