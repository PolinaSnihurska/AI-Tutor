# Monitoring and Observability

This directory contains the monitoring and observability infrastructure for the AI Tutoring Platform.

## Components

### 1. Sentry - Error Tracking
- Captures and tracks application errors and exceptions
- Provides detailed error context and stack traces
- Supports performance monitoring and profiling

### 2. Prometheus - Metrics Collection
- Collects time-series metrics from all services
- Stores metrics for querying and alerting
- Provides powerful query language (PromQL)

### 3. Grafana - Visualization
- Visualizes metrics from Prometheus
- Pre-configured dashboards for service monitoring
- Customizable alerts and notifications

### 4. Alertmanager - Alert Management
- Manages alerts from Prometheus
- Routes alerts to appropriate channels
- Supports grouping, inhibition, and silencing

## Setup

### Prerequisites
- Docker and Docker Compose
- Services running with metrics endpoints exposed

### Starting the Monitoring Stack

```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### Accessing Services

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Alertmanager**: http://localhost:9093

### Configuration

#### Sentry Setup

1. Sign up for Sentry at https://sentry.io or self-host
2. Create a new project for each service
3. Add DSN to environment variables:

```bash
# .env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

#### Prometheus Configuration

Edit `prometheus.yml` to add or modify scrape targets:

```yaml
scrape_configs:
  - job_name: 'your-service'
    static_configs:
      - targets: ['your-service:port']
```

#### Grafana Dashboards

1. Log in to Grafana (http://localhost:3000)
2. Add Prometheus as a data source
3. Import the pre-configured dashboard from `grafana-dashboard.json`

## Metrics

### HTTP Metrics
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration histogram
- `active_connections` - Current active connections

### AI Service Metrics
- `ai_generation_duration_seconds` - AI generation duration
- `ai_generation_total` - Total AI generation requests
- `openai_api_calls_total` - OpenAI API calls
- `openai_tokens_used_total` - OpenAI tokens consumed

### Database Metrics
- `db_query_duration_seconds` - Database query duration
- `pg_stat_database_numbackends` - Active database connections

### Cache Metrics
- `cache_operations_total` - Cache operations (hit/miss)
- `redis_up` - Redis availability

## Health Checks

Each service exposes the following endpoints:

- `/health` - Comprehensive health check with dependency status
- `/ready` - Readiness probe for Kubernetes
- `/live` - Liveness probe for Kubernetes
- `/metrics` - Prometheus metrics endpoint

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "auth-service",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database connection successful",
      "responseTime": 5
    },
    "redis": {
      "status": "pass",
      "message": "Redis connection successful",
      "responseTime": 2
    }
  }
}
```

## Alerts

### Configured Alerts

1. **ServiceDown** - Service is unreachable
2. **HighErrorRate** - Error rate above 5%
3. **HighResponseTime** - P95 response time above 2s
4. **AIGenerationSlow** - AI generation above 5s
5. **HighMemoryUsage** - Memory usage above 90%
6. **SlowDatabaseQueries** - Database queries above 1s
7. **LowCacheHitRate** - Cache hit rate below 50%

### Alert Configuration

Edit `alerts.yml` to add or modify alert rules:

```yaml
- alert: YourAlert
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Alert summary"
    description: "Alert description"
```

### Alert Routing

Configure alert routing in `alertmanager.yml`:

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'team@example.com'
```

## Best Practices

### 1. Metric Naming
- Use descriptive names with units (e.g., `_seconds`, `_bytes`)
- Follow Prometheus naming conventions
- Use consistent labels across services

### 2. Alert Thresholds
- Set realistic thresholds based on baseline metrics
- Use `for` clause to avoid alert fatigue
- Group related alerts

### 3. Dashboard Design
- Focus on key metrics (RED: Rate, Errors, Duration)
- Use appropriate visualization types
- Include context and annotations

### 4. Error Tracking
- Capture errors with relevant context
- Set appropriate sample rates for production
- Use breadcrumbs for debugging

## Troubleshooting

### Metrics Not Appearing

1. Check service is exposing `/metrics` endpoint
2. Verify Prometheus can reach the service
3. Check Prometheus logs: `docker logs prometheus`

### Alerts Not Firing

1. Verify alert rules in Prometheus UI
2. Check Alertmanager configuration
3. Test alert routing with `amtool`

### High Memory Usage

1. Check metric cardinality (too many labels)
2. Adjust retention period in Prometheus
3. Increase resource limits

## Monitoring in Production

### Kubernetes Deployment

```yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3001"
    prometheus.io/path: "/metrics"
```

### Scaling Considerations

- Use Prometheus federation for large deployments
- Implement metric aggregation for high-cardinality data
- Use remote storage for long-term retention

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
