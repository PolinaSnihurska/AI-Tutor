# Database Optimization Guide

This document outlines database optimization strategies, indexing best practices, and query optimization techniques for the AI Tutoring Platform.

## Overview

The platform uses PostgreSQL for relational data and MongoDB for document storage. This guide focuses on PostgreSQL optimizations, which handle the majority of transactional and analytical workloads.

## Connection Pooling

### Configuration

Each service uses optimized connection pool settings:

**Auth Service** (Transactional workload):
```typescript
{
  max: 20,           // Maximum connections
  min: 5,            // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  keepAlive: true
}
```

**Analytics Service** (Analytical workload):
```typescript
{
  max: 30,           // Larger pool for analytics
  min: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 60000,  // Longer timeout for complex queries
  keepAlive: true
}
```

### Best Practices

1. **Pool Size**: Set based on workload and available connections
   - Formula: `connections = ((core_count * 2) + effective_spindle_count)`
   - Monitor active connections: `SELECT count(*) FROM pg_stat_activity;`

2. **Connection Reuse**: Always release connections back to pool
   ```typescript
   const client = await pool.connect();
   try {
     await client.query('...');
   } finally {
     client.release();
   }
   ```

3. **Idle Timeout**: Close idle connections to free resources

4. **Keep-Alive**: Prevent connection drops in cloud environments

## Indexing Strategy

### Primary Indexes

All tables have appropriate indexes for common query patterns:

#### Users Table
```sql
-- Primary key
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Composite index for filtered queries
CREATE INDEX idx_users_role_email_verified ON users(role, email_verified) 
  WHERE email_verified = true;
```

#### Subscriptions Table
```sql
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Partial index for active subscriptions only
CREATE INDEX idx_active_subscriptions ON subscriptions(user_id) 
  WHERE status = 'active';
```

#### Analytics Snapshots Table
```sql
-- Composite index for time-series queries
CREATE INDEX idx_analytics_student_date ON analytics_snapshots(student_id, snapshot_date DESC);

-- Index for date range queries
CREATE INDEX idx_analytics_date_range ON analytics_snapshots(snapshot_date) 
  WHERE snapshot_date >= CURRENT_DATE - INTERVAL '90 days';
```

### Index Types

1. **B-tree Indexes** (Default): Best for equality and range queries
2. **GIN Indexes**: For JSONB and full-text search
3. **Partial Indexes**: Index subset of rows matching condition
4. **Composite Indexes**: Multiple columns for complex queries

### Index Maintenance

```sql
-- Analyze table statistics
ANALYZE table_name;

-- Vacuum and analyze
VACUUM ANALYZE table_name;

-- Reindex if needed
REINDEX TABLE table_name;
```

## Query Optimization

### 1. Use EXPLAIN ANALYZE

Always analyze slow queries:

```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM analytics_snapshots 
WHERE student_id = 'xxx' 
  AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days';
```

Look for:
- Sequential scans (should use indexes)
- High buffer usage
- Slow execution time

### 2. Avoid N+1 Queries

**Bad:**
```typescript
const users = await query('SELECT * FROM users');
for (const user of users.rows) {
  const subscription = await query(
    'SELECT * FROM subscriptions WHERE user_id = $1',
    [user.id]
  );
}
```

**Good:**
```typescript
const result = await query(`
  SELECT u.*, s.*
  FROM users u
  LEFT JOIN subscriptions s ON s.user_id = u.id
`);
```

### 3. Use Prepared Statements

For repeated queries:

```typescript
// Prepared statement (cached query plan)
await queryOptimizer.executePrepared(
  'get_user_by_email',
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

### 4. Batch Operations

**Bad:**
```typescript
for (const item of items) {
  await query('INSERT INTO table VALUES ($1, $2)', [item.a, item.b]);
}
```

**Good:**
```typescript
await queryOptimizer.batchInsert(
  'table',
  ['column_a', 'column_b'],
  items.map(item => [item.a, item.b])
);
```

### 5. Limit Result Sets

Always use LIMIT for large result sets:

```typescript
const result = await query(`
  SELECT * FROM analytics_snapshots
  WHERE student_id = $1
  ORDER BY snapshot_date DESC
  LIMIT 30
`, [studentId]);
```

### 6. Use Materialized Views

For expensive aggregations:

```sql
CREATE MATERIALIZED VIEW mv_student_performance_summary AS
SELECT 
  student_id,
  AVG(overall_score) as avg_score,
  SUM(tests_completed) as total_tests
FROM analytics_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY student_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_performance_summary;
```

## Performance Monitoring

### Key Metrics

1. **Query Performance**
   ```sql
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

2. **Index Usage**
   ```sql
   SELECT 
     schemaname, tablename, indexrelname,
     idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

3. **Table Statistics**
   ```sql
   SELECT 
     schemaname, tablename,
     n_live_tup, n_dead_tup,
     last_vacuum, last_autovacuum
   FROM pg_stat_user_tables;
   ```

4. **Connection Pool**
   ```sql
   SELECT count(*), state
   FROM pg_stat_activity
   GROUP BY state;
   ```

### Monitoring Tools

- **pg_stat_statements**: Track query performance
- **pgBadger**: Log analyzer
- **pgAdmin**: GUI for monitoring
- **Prometheus + Grafana**: Metrics visualization

## Common Performance Issues

### 1. Slow Queries

**Symptoms**: Queries taking > 1 second

**Solutions**:
- Add appropriate indexes
- Optimize WHERE clauses
- Use EXPLAIN ANALYZE
- Consider query rewrite

### 2. High CPU Usage

**Symptoms**: Database CPU > 80%

**Solutions**:
- Identify expensive queries
- Add indexes to reduce sequential scans
- Optimize JOIN operations
- Consider read replicas

### 3. High Memory Usage

**Symptoms**: Out of memory errors

**Solutions**:
- Tune `shared_buffers` (25% of RAM)
- Tune `work_mem` for sort operations
- Reduce connection pool size
- Optimize query memory usage

### 4. Lock Contention

**Symptoms**: Queries waiting for locks

**Solutions**:
- Use shorter transactions
- Avoid long-running queries
- Use appropriate isolation levels
- Monitor lock waits:
  ```sql
  SELECT * FROM pg_locks WHERE NOT granted;
  ```

### 5. Bloat

**Symptoms**: Table/index size growing without data increase

**Solutions**:
- Regular VACUUM operations
- Tune autovacuum settings
- Consider pg_repack for severe bloat

## PostgreSQL Configuration

### Recommended Settings

```conf
# Memory
shared_buffers = 4GB              # 25% of RAM
effective_cache_size = 12GB       # 75% of RAM
work_mem = 64MB                   # Per operation
maintenance_work_mem = 1GB        # For VACUUM, CREATE INDEX

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 4GB

# Query Planning
random_page_cost = 1.1            # For SSD
effective_io_concurrency = 200    # For SSD

# Connections
max_connections = 200

# Logging
log_min_duration_statement = 1000 # Log queries > 1s
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

## Backup and Maintenance

### Regular Maintenance Tasks

1. **Daily**:
   - Monitor slow queries
   - Check connection pool usage
   - Review error logs

2. **Weekly**:
   - Analyze query statistics
   - Review index usage
   - Check for unused indexes

3. **Monthly**:
   - Full database backup
   - Review and optimize slow queries
   - Update table statistics
   - Check for table bloat

### Backup Strategy

```bash
# Full backup
pg_dump -Fc ai_tutor > backup_$(date +%Y%m%d).dump

# Restore
pg_restore -d ai_tutor backup_20231201.dump

# Continuous archiving (WAL)
# Configure in postgresql.conf:
# wal_level = replica
# archive_mode = on
# archive_command = 'cp %p /archive/%f'
```

## Scaling Strategies

### Vertical Scaling
- Increase CPU, RAM, and storage
- Optimize PostgreSQL configuration
- Use faster storage (NVMe SSD)

### Horizontal Scaling

1. **Read Replicas**:
   - Route read queries to replicas
   - Use for analytics and reporting
   - Reduce load on primary

2. **Partitioning**:
   ```sql
   -- Partition by date
   CREATE TABLE analytics_snapshots_2024_01 
   PARTITION OF analytics_snapshots
   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
   ```

3. **Sharding**:
   - Shard by student_id or region
   - Use Citus or manual sharding
   - Complex but highly scalable

## Query Optimizer Utility

Use the built-in query optimizer:

```typescript
import { queryOptimizer } from './db/queryOptimizer';

// Execute with monitoring
const result = await queryOptimizer.executeQuery(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// Get statistics
const stats = queryOptimizer.getQueryStats();
console.log('Avg query time:', stats.avgDuration);

// Analyze query plan
const plan = await queryOptimizer.explainQuery(
  'SELECT * FROM analytics_snapshots WHERE student_id = $1',
  [studentId]
);

// Find unused indexes
const unusedIndexes = await queryOptimizer.findUnusedIndexes();
```

## Best Practices Summary

1. ✅ Use connection pooling with appropriate settings
2. ✅ Create indexes for all foreign keys and common WHERE clauses
3. ✅ Use composite indexes for multi-column queries
4. ✅ Use partial indexes for filtered queries
5. ✅ Always use LIMIT for large result sets
6. ✅ Avoid N+1 queries with JOINs
7. ✅ Use prepared statements for repeated queries
8. ✅ Batch insert/update operations
9. ✅ Monitor query performance regularly
10. ✅ Keep PostgreSQL and drivers updated

## Troubleshooting

### Query is slow

1. Run EXPLAIN ANALYZE
2. Check if indexes are being used
3. Look for sequential scans
4. Check table statistics are up to date
5. Consider query rewrite

### Connection pool exhausted

1. Check for connection leaks
2. Increase pool size if needed
3. Reduce query execution time
4. Use connection timeout

### High database load

1. Identify slow queries
2. Check for missing indexes
3. Review connection pool settings
4. Consider read replicas
5. Optimize application code

## Resources

- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Use The Index, Luke](https://use-the-index-luke.com/)
- [PgTune](https://pgtune.leopard.in.ua/) - Configuration generator
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
