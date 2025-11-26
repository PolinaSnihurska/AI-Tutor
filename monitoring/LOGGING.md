# Logging Infrastructure

This document describes the logging infrastructure for the AI Tutoring Platform.

## Overview

The platform uses a centralized logging system based on the ELK stack (Elasticsearch, Logstash, Kibana) with structured JSON logging.

## Architecture

```
Services → Winston/Python Logging → Filebeat → Logstash → Elasticsearch → Kibana
                                                                        ↓
                                                                   ElastAlert
```

## Log Levels

- **ERROR**: Application errors and exceptions
- **WARN**: Warning messages for potentially harmful situations
- **INFO**: Informational messages about application progress
- **HTTP**: HTTP request/response logs
- **DEBUG**: Detailed debugging information

## Structured Logging

All logs are structured in JSON format with the following fields:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "INFO",
  "message": "Request completed",
  "service": "auth-service",
  "environment": "production",
  "userId": "user-123",
  "method": "POST",
  "url": "/api/auth/login",
  "statusCode": 200,
  "duration": 150,
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

## Usage

### Node.js Services

```typescript
import { log } from './utils/logger';

// Basic logging
log.info('User logged in', { userId: user.id });
log.error('Database connection failed', { error: err.message });

// HTTP logging (automatic via middleware)
app.use(httpLogger);

// Audit logging
auditLog('user_created', {
  userId: user.id,
  email: user.email,
  role: user.role
});
```

### Python Services

```python
from app.logging_config import logger

# Basic logging
logger.info('AI generation started', extra={'operation': 'explanation'})
logger.error('OpenAI API error', extra={'error': str(e)})

# With context
logger.info('Request processed', extra={
    'duration': duration,
    'model': 'gpt-4',
    'tokens': token_count
})
```

## Log Aggregation

### Starting the Logging Stack

```bash
cd monitoring
docker-compose -f docker-compose.logging.yml up -d
```

### Accessing Kibana

1. Open http://localhost:5601
2. Go to Management → Index Patterns
3. Create index pattern: `logs-*`
4. Set time field: `@timestamp`

### Creating Visualizations

1. Go to Visualize → Create visualization
2. Select visualization type (e.g., Line chart, Pie chart)
3. Configure metrics and buckets
4. Save visualization

### Creating Dashboards

1. Go to Dashboard → Create dashboard
2. Add saved visualizations
3. Arrange and resize panels
4. Save dashboard

## Log-Based Alerts

### ElastAlert Rules

ElastAlert monitors logs and triggers alerts based on patterns:

1. **High Error Rate**: Alerts when error count exceeds threshold
2. **Slow Requests**: Alerts on performance degradation
3. **Authentication Failures**: Detects potential security threats
4. **Service Unavailable**: Alerts when services go down

### Adding Custom Rules

Create a new YAML file in `monitoring/elastalert-rules/`:

```yaml
name: Custom Alert
type: frequency
index: logs-*
num_events: 10
timeframe:
  minutes: 5

filter:
  - term:
      your_field: "your_value"

alert:
  - email
  - slack

email:
  - "team@example.com"
```

## Best Practices

### 1. Log Meaningful Information

```typescript
// Good
log.info('User authentication successful', {
  userId: user.id,
  method: 'email',
  duration: authTime
});

// Bad
log.info('Auth OK');
```

### 2. Include Context

```typescript
// Good
log.error('Database query failed', {
  query: 'SELECT * FROM users',
  error: err.message,
  duration: queryTime
});

// Bad
log.error('Query failed');
```

### 3. Use Appropriate Log Levels

- Use ERROR for actual errors that need attention
- Use WARN for recoverable issues
- Use INFO for normal operations
- Use DEBUG for detailed troubleshooting

### 4. Sanitize Sensitive Data

```typescript
// Good
const sanitized = { ...user };
delete sanitized.password;
log.info('User created', sanitized);

// Bad
log.info('User created', user); // Contains password
```

### 5. Add Correlation IDs

```typescript
// Add request ID for tracing
app.use((req, res, next) => {
  req.id = generateId();
  res.setHeader('X-Request-ID', req.id);
  next();
});

log.info('Processing request', { requestId: req.id });
```

## Querying Logs

### Kibana Query Language (KQL)

```
# Find all errors
level: "ERROR"

# Find errors for specific service
service: "auth-service" AND level: "ERROR"

# Find slow requests
duration > 2000

# Find requests by user
userId: "user-123"

# Time range queries
@timestamp >= "2024-01-01" AND @timestamp < "2024-01-02"

# Wildcard searches
message: *authentication*

# Boolean queries
(level: "ERROR" OR level: "WARN") AND service: "ai-service"
```

### Lucene Query Syntax

```
# Exact match
level:ERROR

# Range query
duration:[1000 TO 5000]

# Wildcard
message:auth*

# Regex
message:/error|failure/

# Exists
_exists_:userId

# Boolean
level:ERROR AND service:auth-service
```

## Log Retention

### Elasticsearch Index Lifecycle Management (ILM)

```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "7d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Troubleshooting

### Logs Not Appearing in Kibana

1. Check Filebeat is running: `docker logs filebeat`
2. Verify Logstash is processing: `docker logs logstash`
3. Check Elasticsearch indices: `curl http://localhost:9200/_cat/indices`
4. Verify log files exist and are readable

### High Disk Usage

1. Check index sizes: `GET /_cat/indices?v&s=store.size:desc`
2. Delete old indices: `DELETE /logs-*-2023.*`
3. Adjust retention policy in ILM
4. Enable index compression

### Slow Queries

1. Use filters instead of queries when possible
2. Limit time range for searches
3. Use index patterns to narrow search scope
4. Consider using aggregations for large datasets

## Monitoring Logging Infrastructure

### Key Metrics

- Elasticsearch cluster health
- Index size and count
- Logstash throughput
- Filebeat shipping rate
- Query performance

### Health Checks

```bash
# Elasticsearch health
curl http://localhost:9200/_cluster/health

# Logstash stats
curl http://localhost:9600/_node/stats

# Filebeat status
docker exec filebeat filebeat test output
```

## Security

### Access Control

1. Enable Elasticsearch security features
2. Create role-based access for Kibana
3. Use TLS for all connections
4. Implement audit logging

### Data Protection

1. Encrypt logs at rest
2. Use TLS for log shipping
3. Sanitize sensitive data before logging
4. Implement log retention policies

## Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash Documentation](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana Documentation](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Filebeat Documentation](https://www.elastic.co/guide/en/beats/filebeat/current/index.html)
- [ElastAlert Documentation](https://elastalert.readthedocs.io/)
