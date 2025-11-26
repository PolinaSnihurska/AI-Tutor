# Backup and Restore Scripts

This directory contains scripts for backing up and restoring the AI Tutoring Platform databases.

## Overview

The backup system provides automated daily backups of:
- PostgreSQL (user data, subscriptions, learning plans)
- MongoDB (tests, conversations, content)
- Redis (cache and session data)

Backups are stored both locally and in S3 for redundancy.

## Prerequisites

### Required Tools

- `pg_dump` and `pg_restore` (PostgreSQL client tools)
- `mongodump` and `mongorestore` (MongoDB database tools)
- `redis-cli` (Redis command-line interface)
- `aws` CLI (for S3 uploads)
- `bash` 4.0 or higher

### Environment Variables

Create a `.env` file or export these variables:

```bash
# Database Credentials
export DB_HOST="postgres-service"
export DB_PORT="5432"
export DB_NAME="ai_tutor"
export DB_USER="postgres"
export DB_PASSWORD="your_password"

export MONGO_HOST="mongodb-service"
export MONGO_PORT="27017"
export MONGO_DB="ai_tutor"
export MONGO_USER="mongo"
export MONGO_PASSWORD="your_password"

export REDIS_HOST="redis-service"
export REDIS_PORT="6379"
export REDIS_PASSWORD="your_password"

# Backup Configuration
export BACKUP_DIR="/backups"
export RETENTION_DAYS="30"
export S3_BACKUP_BUCKET="ai-tutor-backups"
export ENVIRONMENT="production"

# AWS Credentials
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_DEFAULT_REGION="us-east-1"

# Optional: Slack notifications
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

## Backup Scripts

### Individual Backups

#### PostgreSQL Backup
```bash
./backup-postgres.sh
```

Features:
- Creates compressed custom-format dump
- Uploads to S3 with metadata
- Verifies backup integrity
- Cleans up old backups
- Sends notifications

#### MongoDB Backup
```bash
./backup-mongodb.sh
```

Features:
- Creates gzipped mongodump
- Creates tarball for easy transfer
- Uploads to S3 with metadata
- Verifies backup integrity
- Cleans up old backups
- Sends notifications

#### Redis Backup
```bash
./backup-redis.sh
```

Features:
- Triggers BGSAVE for consistent snapshot
- Compresses RDB file
- Uploads to S3
- Cleans up old backups
- Sends notifications

### Full System Backup

Run all backups sequentially:

```bash
./backup-all.sh
```

This script:
- Executes all individual backup scripts
- Tracks failures
- Sends summary notification
- Returns appropriate exit code

## Restore Scripts

### PostgreSQL Restore

#### Restore from latest local backup
```bash
cd ../restore
./restore-postgres.sh --latest
```

#### Restore from latest S3 backup
```bash
./restore-postgres.sh --latest --s3
```

#### Restore from specific date
```bash
./restore-postgres.sh --date 20240101 --s3
```

#### Restore from specific file
```bash
./restore-postgres.sh --file postgres_backup_20240101_120000.sql.gz
```

#### Skip confirmation prompt
```bash
./restore-postgres.sh --latest --no-confirm
```

### MongoDB Restore

#### Restore from latest backup (drops existing collections)
```bash
./restore-mongodb.sh --latest --drop
```

#### Restore from S3
```bash
./restore-mongodb.sh --latest --s3 --drop
```

#### Restore from specific date
```bash
./restore-mongodb.sh --date 20240101 --s3 --drop
```

### Redis Restore

#### Restore from latest backup
```bash
./restore-redis.sh --latest
```

#### Restore from S3
```bash
./restore-redis.sh --latest --s3
```

**Note**: Redis restore requires stopping Redis, so plan accordingly.

## Automated Backups

### Kubernetes CronJobs

Automated backups are configured in `k8s/backup-cronjobs.yaml`:

```bash
# Deploy backup CronJobs
kubectl apply -f ../../k8s/backup-cronjobs.yaml

# Check CronJob status
kubectl get cronjobs -n ai-tutoring-platform

# View recent backup jobs
kubectl get jobs -n ai-tutoring-platform

# Check backup logs
kubectl logs -n ai-tutoring-platform -l app=postgres-backup
```

### Cron Schedule

```
PostgreSQL: Daily at 2:00 AM UTC
MongoDB:    Daily at 3:00 AM UTC
Redis:      Daily at 4:00 AM UTC
```

### Docker Compose

For local development, add to your crontab:

```bash
# Edit crontab
crontab -e

# Add backup jobs
0 2 * * * cd /opt/ai-tutor/scripts/backup && ./backup-postgres.sh >> /var/log/backup-postgres.log 2>&1
0 3 * * * cd /opt/ai-tutor/scripts/backup && ./backup-mongodb.sh >> /var/log/backup-mongodb.log 2>&1
0 4 * * * cd /opt/ai-tutor/scripts/backup && ./backup-redis.sh >> /var/log/backup-redis.log 2>&1
```

## Backup Verification

### Manual Verification

```bash
# List recent backups
ls -lh /backups/postgres/
ls -lh /backups/mongodb/
ls -lh /backups/redis/

# Check S3 backups
aws s3 ls s3://ai-tutor-backups/production/postgres/
aws s3 ls s3://ai-tutor-backups/production/mongodb/
aws s3 ls s3://ai-tutor-backups/production/redis/

# Verify backup integrity
gunzip -t /backups/postgres/postgres_backup_20240101_120000.sql.gz
tar -tzf /backups/mongodb/mongodb_backup_20240101_120000.tar.gz
```

### Automated Verification

Backup scripts automatically verify:
- File integrity (can be decompressed)
- File size is reasonable
- Upload to S3 succeeded
- Metadata is correct

## Monitoring

### Backup Metrics

Monitor these metrics in Grafana:
- Backup success rate
- Backup duration
- Backup file size
- Time since last successful backup
- S3 upload success rate

### Alerts

Configure alerts for:
- Backup failure
- Backup duration exceeds threshold
- No backup in 25 hours
- S3 upload failure
- Backup file size anomaly

### Slack Notifications

Backup scripts send notifications to Slack:
- ✅ Success: Backup completed with size and filename
- ❌ Failure: Backup failed with error details
- ⚠️ Warning: Partial success (some backups failed)

## Retention Policy

### Local Storage
- PostgreSQL: 30 days
- MongoDB: 30 days
- Redis: 7 days

### S3 Storage
- Standard-IA: 90 days
- Glacier: 1 year
- Automatic deletion after 1 year

### S3 Lifecycle Configuration

```json
{
  "Rules": [
    {
      "Id": "BackupLifecycle",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

## Troubleshooting

### Backup Fails with "Permission Denied"

```bash
# Make scripts executable
chmod +x backup-*.sh
chmod +x ../restore/restore-*.sh

# Check directory permissions
ls -ld /backups
```

### S3 Upload Fails

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check S3 bucket exists
aws s3 ls s3://ai-tutor-backups/

# Test S3 upload
echo "test" > /tmp/test.txt
aws s3 cp /tmp/test.txt s3://ai-tutor-backups/test.txt
```

### Database Connection Fails

```bash
# Test PostgreSQL connection
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;"

# Test MongoDB connection
mongosh --host "${MONGO_HOST}" --username "${MONGO_USER}" --password "${MONGO_PASSWORD}" --authenticationDatabase admin --eval "db.version()"

# Test Redis connection
redis-cli -h "${REDIS_HOST}" -a "${REDIS_PASSWORD}" PING
```

### Restore Fails

```bash
# Check backup file integrity
gunzip -t /path/to/backup.sql.gz

# Check available disk space
df -h

# Check database is accessible
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres -c "SELECT 1;"

# Review restore logs
tail -f /backups/restore.log
```

### Out of Disk Space

```bash
# Check disk usage
df -h /backups

# Clean up old backups manually
find /backups/postgres -name "*.sql.gz" -mtime +30 -delete
find /backups/mongodb -name "*.tar.gz" -mtime +30 -delete
find /backups/redis -name "*.rdb.gz" -mtime +7 -delete

# Verify cleanup
df -h /backups
```

## Best Practices

1. **Test Restores Regularly**: Run restore tests monthly to ensure backups are valid
2. **Monitor Backup Size**: Sudden changes in backup size may indicate issues
3. **Verify S3 Uploads**: Ensure backups are successfully uploaded to S3
4. **Keep Multiple Copies**: Maintain both local and S3 backups
5. **Document Procedures**: Keep this README and disaster recovery plan updated
6. **Secure Credentials**: Use secrets management for database passwords
7. **Encrypt Backups**: Consider encrypting backups at rest
8. **Test Disaster Recovery**: Run full DR drills quarterly

## Security Considerations

### Backup Encryption

For additional security, encrypt backups before uploading to S3:

```bash
# Encrypt backup
gpg --symmetric --cipher-algo AES256 backup.sql.gz

# Upload encrypted backup
aws s3 cp backup.sql.gz.gpg s3://ai-tutor-backups/

# Decrypt for restore
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

### Access Control

- Limit access to backup scripts and files
- Use IAM roles with minimal required permissions
- Enable S3 bucket versioning
- Enable S3 bucket logging
- Use MFA for S3 bucket deletion

### Audit Trail

- Log all backup and restore operations
- Monitor access to backup files
- Review backup logs regularly
- Alert on unauthorized access attempts

## Related Documentation

- [DISASTER_RECOVERY_PLAN.md](../../DISASTER_RECOVERY_PLAN.md) - Complete DR procedures
- [DATABASE_OPTIMIZATION.md](../../DATABASE_OPTIMIZATION.md) - Database configuration
- [CLOUD_INFRASTRUCTURE.md](../../CLOUD_INFRASTRUCTURE.md) - Infrastructure details

## Support

For issues or questions:
- Create an issue in the project repository
- Contact the DevOps team
- Check the disaster recovery plan
- Review monitoring dashboards

---

**Last Updated**: 2024-01-01  
**Maintained By**: DevOps Team
