import { Pool, QueryResult } from 'pg';
import pool from './connection';

/**
 * Query optimizer utilities for database performance
 */

interface QueryStats {
  query: string;
  duration: number;
  rows: number;
  timestamp: Date;
}

class QueryOptimizer {
  private queryStats: QueryStats[] = [];
  private readonly slowQueryThreshold = 1000; // 1 second

  /**
   * Execute query with performance monitoring
   */
  async executeQuery(
    text: string,
    params?: any[],
    logSlow: boolean = true
  ): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (logSlow && duration > this.slowQueryThreshold) {
        console.warn(`Slow query detected (${duration}ms):`, {
          query: text,
          params,
          rows: result.rowCount,
        });
      }

      // Store stats
      this.queryStats.push({
        query: text.substring(0, 100), // Store first 100 chars
        duration,
        rows: result.rowCount || 0,
        timestamp: new Date(),
      });

      // Keep only last 100 queries
      if (this.queryStats.length > 100) {
        this.queryStats.shift();
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Query error (${duration}ms):`, {
        query: text,
        params,
        error,
      });
      throw error;
    }
  }

  /**
   * Execute query with prepared statement for better performance
   */
  async executePrepared(
    name: string,
    text: string,
    params?: any[]
  ): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // First execution prepares the statement
      const result = await pool.query({
        name,
        text,
        values: params,
      });
      
      const duration = Date.now() - startTime;

      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow prepared query (${duration}ms):`, name);
      }

      return result;
    } catch (error) {
      console.error(`Prepared query error:`, { name, error });
      throw error;
    }
  }

  /**
   * Execute batch insert for better performance
   */
  async batchInsert(
    table: string,
    columns: string[],
    values: any[][],
    batchSize: number = 100
  ): Promise<number> {
    let totalInserted = 0;

    // Process in batches
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      
      // Build VALUES clause
      const valuePlaceholders = batch
        .map((_, batchIndex) => {
          const rowPlaceholders = columns
            .map((_, colIndex) => `$${batchIndex * columns.length + colIndex + 1}`)
            .join(', ');
          return `(${rowPlaceholders})`;
        })
        .join(', ');

      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES ${valuePlaceholders}
      `;

      const flatValues = batch.flat();
      const result = await this.executeQuery(query, flatValues);
      totalInserted += result.rowCount || 0;
    }

    return totalInserted;
  }

  /**
   * Analyze query plan
   */
  async explainQuery(query: string, params?: any[]): Promise<any[]> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const result = await pool.query(explainQuery, params);
    return result.rows[0]['QUERY PLAN'];
  }

  /**
   * Get query statistics
   */
  getQueryStats(): {
    total: number;
    avgDuration: number;
    slowQueries: number;
    recentQueries: QueryStats[];
  } {
    const total = this.queryStats.length;
    const avgDuration = total > 0
      ? this.queryStats.reduce((sum, stat) => sum + stat.duration, 0) / total
      : 0;
    const slowQueries = this.queryStats.filter(
      stat => stat.duration > this.slowQueryThreshold
    ).length;

    return {
      total,
      avgDuration,
      slowQueries,
      recentQueries: this.queryStats.slice(-10),
    };
  }

  /**
   * Clear query statistics
   */
  clearStats(): void {
    this.queryStats = [];
  }

  /**
   * Vacuum and analyze table
   */
  async optimizeTable(tableName: string): Promise<void> {
    await pool.query(`VACUUM ANALYZE ${tableName}`);
    console.log(`Optimized table: ${tableName}`);
  }

  /**
   * Get table statistics
   */
  async getTableStats(tableName: string): Promise<any> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        n_tup_ins AS inserts,
        n_tup_upd AS updates,
        n_tup_del AS deletes,
        n_live_tup AS live_tuples,
        n_dead_tup AS dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE tablename = $1
    `;
    
    const result = await pool.query(query, [tableName]);
    return result.rows[0];
  }

  /**
   * Get index usage statistics
   */
  async getIndexStats(tableName: string): Promise<any[]> {
    const query = `
      SELECT
        indexrelname AS index_name,
        idx_scan AS index_scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
      FROM pg_stat_user_indexes
      WHERE relname = $1
      ORDER BY idx_scan DESC
    `;
    
    const result = await pool.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Find unused indexes
   */
  async findUnusedIndexes(): Promise<any[]> {
    const query = `
      SELECT
        schemaname,
        tablename,
        indexrelname AS index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(indexrelid) DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

export const queryOptimizer = new QueryOptimizer();
