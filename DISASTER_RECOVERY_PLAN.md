# Disaster Recovery Plan

## Overview

This document outlines the disaster recovery procedures for the AI Tutoring Platform. It covers backup strategies, restoration procedures, and recovery time objectives (RTO) and recovery point objectives (RPO) for various disaster scenarios.

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Recovery Objectives](#recovery-objectives)
3. [Disaster Scenarios](#disaster-scenarios)
4. [Recovery Procedures](#recovery-procedures)
5. [Testing and Validation](#testing-and-validation)
6. [Roles and Responsibilities](#roles-and-responsibilities)
7. [Communication Plan](#communication-plan)

## Backup Strategy

### Automated Backups

#### PostgreSQL
- **Frequency**: Daily at 2:00 AM UTC
- **Method**: `pg_dump` with custom format and compression
- **Retention**: 
  - Local: 30 days
  - S3 Standard-IA: 90 days
  - S3 Glacier: 1 year
- **Location**: 
  - Primary: S3 bucket `ai-tutor-backups/production/postgres/`
  - Secondary: Local persistent volume
- **Verification**: Automated integrity checks after each backup

#### MongoDB
- **Frequency**: Daily at 3:00 AM UTC
- **Method**: `mongodump` with gzip compression
- **Retention**:
  - Local: 30 days
  - S3 Standard-IA: 90 days
  - S3 Glacier: 1 year
- **Location**:
  - Primary: S3 bucket `ai-tutor-backups/production/mongodb/`
  - Secondary: Local persistent volume
- **Verification**: Automated integrity checks after each backup

#### Redis
- **Frequency**: Daily at 4:00 AM UTC
- **Method**: RDB snapshots
- **Retention**:
  - Local: 7 days
  - S3 Standard-IA: 30 days
- **Location**:
  - Primary: S3 bucket `ai-tutor-backups/production/redis/`
  - Secondary: Local persistent volume
- **Note**: Redis data is primarily cache and can be regenerated

### Backup Monitoring

- **Alerting**: Slack notifications for backup success/failure
- **Metrics**: Backup size, duration, and success rate tracked in Grafana
- **Health Checks**: Daily automated verification of latest backups
- **Manual Verification**: Weekly manual spot checks of backup integrity

### S3 Lifecycle Policies

```yaml
Lifecycle Rules:
  - Standard-IA after 30 days
  - Glacier after 90 days
  - Delete after 365 days
  - Versioning enabled for 30 days
```

## Recovery Objectives

### Recovery Time Objective (RTO)

| Component | RTO | Description |
|-----------|-----|-------------|
| PostgreSQL | 2 hours | Time to restore database and verify integrity |
| MongoDB | 2 hours | Time to restore database and verify integrity |
| Redis | 30 minutes | Time to restore cache (or rebuild from scratch) |
| Application Services | 1 hour | Time to redeploy all services |
| **Total System** | **4 hours** | Complete system recovery |

### Recovery Point Objective (RPO)

| Component | RPO | Description |
|-----------|-----|-------------|
| PostgreSQL | 24 hours | Maximum acceptable data loss |
| MongoDB | 24 hours | Maximum acceptable data loss |
| Redis | 24 hours | Cache data, can be regenerated |
| **Total System** | **24 hours** | Maximum acceptable data loss |

### Service Level Objectives (SLO)

- **Availability**: 99.9% uptime (8.76 hours downtime per year)
- **Data Durability**: 99.999999999% (11 nines)
- **Backup Success Rate**: 99.5%

## Disaster Scenarios

### Scenario 1: Database Corruption

**Impact**: Data integrity issues in PostgreSQL or MongoDB

**Detection**:
- Application errors related to data inconsistency
- Database health check failures
- User reports of incorrect data

**Recovery Procedure**:
1. Identify the scope of corruption
2. Stop affected services
3. Restore from the most recent clean backup
4. Verify data integrity
5. Restart services
6. Monitor for issues

**Estimated Recovery Time**: 2-3 hours

### Scenario 2: Complete Data Center Failure

**Impact**: Total loss of primary infrastructure

**Detection**:
- All services unreachable
- Monitoring alerts for all systems
- Cloud provider status page

**Recovery Procedure**:
1. Activate disaster recovery team
2. Provision new infrastructure in alternate region
3. Restore databases from S3 backups
4. Deploy application services
5. Update DNS to point to new infrastructure
6. Verify all services operational
7. Communicate with users

**Estimated Recovery Time**: 4-6 hours

### Scenario 3: Accidental Data Deletion

**Impact**: User data or critical records deleted

**Detection**:
- User reports
- Audit log alerts
- Data validation checks

**Recovery Procedure**:
1. Identify what was deleted and when
2. Find the most recent backup before deletion
3. Restore specific data (point-in-time recovery if available)
4. Verify restored data
5. Implement additional safeguards

**Estimated Recovery Time**: 1-2 hours

### Scenario 4: Ransomware Attack

**Impact**: Data encrypted by malicious actors

**Detection**:
- Unusual file system activity
- Security alerts
- Services unable to access data

**Recovery Procedure**:
1. Isolate affected systems immediately
2. Activate incident response team
3. Assess extent of compromise
4. Provision clean infrastructure
5. Restore from verified clean backups
6. Implement enhanced security measures
7. Conduct forensic analysis

**Estimated Recovery Time**: 6-12 hours

### Scenario 5: Application Bug Causing Data Corruption

**Impact**: Application logic error corrupts data over time

**Detection**:
- Data validation failures
- User reports of incorrect behavior
- Automated data quality checks

**Recovery Procedure**:
1. Identify when corruption started
2. Stop affected services
3. Restore from backup before corruption
4. Fix application bug
5. Deploy fixed version
6. Verify data integrity
7. Resume operations

**Estimated Recovery Time**: 3-4 hours

## Recovery Procedures

### PostgreSQL Recovery

#### Full Database Restore

```bash
# Download latest backup from S3
cd /opt/ai-tutor/scripts/restore
./restore-postgres.sh --latest --s3

# Or restore from specific date
./restore-postgres.sh --date 20240101 --s3

# Or restore from local backup
./restore-postgres.sh --latest
```

#### Point-in-Time Recovery (PITR)

For point-in-time recovery, we use PostgreSQL WAL archiving:

```bash
# Restore base backup
./restore-postgres.sh --latest --s3

# Apply WAL files up to specific time
PGPASSWORD="${DB_PASSWORD}" psql \
  -h postgres-service \
  -U postgres \
  -d ai_tutor \
  -c "SELECT pg_wal_replay_resume();"
```

### MongoDB Recovery

#### Full Database Restore

```bash
# Download latest backup from S3
cd /opt/ai-tutor/scripts/restore
./restore-mongodb.sh --latest --s3 --drop

# Or restore from specific date
./restore-mongodb.sh --date 20240101 --s3 --drop

# Or restore from local backup
./restore-mongodb.sh --latest --drop
```

#### Selective Collection Restore

```bash
# Restore specific collections
mongorestore \
  --host=mongodb-service \
  --port=27017 \
  --username=mongo \
  --password="${MONGO_PASSWORD}" \
  --authenticationDatabase=admin \
  --db=ai_tutor \
  --collection=tests \
  --gzip \
  /path/to/backup/ai_tutor/tests.bson.gz
```

### Redis Recovery

```bash
# Download latest backup from S3
cd /opt/ai-tutor/scripts/restore
./restore-redis.sh --latest --s3

# Or let Redis rebuild cache naturally
# (Redis is primarily cache, data can be regenerated)
```

### Complete System Recovery

#### Step 1: Provision Infrastructure

```bash
# Using Terraform
cd terraform
terraform init
terraform plan -out=recovery.tfplan
terraform apply recovery.tfplan

# Or using Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/storage-class.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
```

#### Step 2: Restore Databases

```bash
# Restore PostgreSQL
./scripts/restore/restore-postgres.sh --latest --s3 --no-confirm

# Restore MongoDB
./scripts/restore/restore-mongodb.sh --latest --s3 --drop --no-confirm

# Restore Redis (optional)
./scripts/restore/restore-redis.sh --latest --s3 --no-confirm
```

#### Step 3: Deploy Services

```bash
# Deploy all services
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/mongodb-statefulset.yaml
kubectl apply -f k8s/redis-cluster.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n ai-tutoring-platform --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb -n ai-tutoring-platform --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n ai-tutoring-platform --timeout=300s

# Deploy application services
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/ai-service.yaml
kubectl apply -f k8s/test-service.yaml
kubectl apply -f k8s/learning-plan-service.yaml
kubectl apply -f k8s/analytics-service.yaml
kubectl apply -f k8s/admin-service.yaml
kubectl apply -f k8s/frontend.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

#### Step 4: Verify System Health

```bash
# Check all pods are running
kubectl get pods -n ai-tutoring-platform

# Check service endpoints
kubectl get svc -n ai-tutoring-platform

# Run health checks
curl https://api.ai-tutor.com/health
curl https://api.ai-tutor.com/auth/health
curl https://api.ai-tutor.com/ai/health

# Verify database connectivity
kubectl exec -n ai-tutoring-platform postgres-0 -- psql -U postgres -d ai_tutor -c "SELECT COUNT(*) FROM users;"
kubectl exec -n ai-tutoring-platform mongodb-0 -- mongosh --eval "db.tests.countDocuments()"
```

#### Step 5: Update DNS (if needed)

```bash
# Update DNS records to point to new infrastructure
# This depends on your DNS provider (Route53, CloudFlare, etc.)

# Example with AWS Route53
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-update.json
```

## Testing and Validation

### Backup Testing Schedule

| Test Type | Frequency | Description |
|-----------|-----------|-------------|
| Backup Integrity | Daily | Automated verification of backup files |
| Restore Test (Dev) | Weekly | Full restore to development environment |
| Restore Test (Staging) | Monthly | Full restore to staging environment |
| Disaster Recovery Drill | Quarterly | Complete DR scenario simulation |
| Failover Test | Semi-annually | Test failover to secondary region |

### Backup Verification Checklist

- [ ] Backup file exists and is not corrupted
- [ ] Backup size is within expected range
- [ ] Backup can be decompressed successfully
- [ ] Database restore completes without errors
- [ ] Restored data matches expected record counts
- [ ] Application can connect to restored database
- [ ] Sample queries return expected results
- [ ] Backup is uploaded to S3 successfully
- [ ] S3 backup has correct metadata
- [ ] Monitoring alerts are functioning

### Recovery Testing Procedure

1. **Preparation**
   - Schedule test during low-traffic period
   - Notify team members
   - Prepare test environment
   - Document current state

2. **Execution**
   - Simulate disaster scenario
   - Follow recovery procedures
   - Document each step and timing
   - Record any issues encountered

3. **Validation**
   - Verify all services are operational
   - Check data integrity
   - Test critical user flows
   - Validate monitoring and alerting

4. **Documentation**
   - Update recovery procedures based on findings
   - Document lessons learned
   - Update RTO/RPO estimates if needed
   - Share results with team

## Roles and Responsibilities

### Disaster Recovery Team

#### Incident Commander
- **Primary**: DevOps Lead
- **Backup**: CTO
- **Responsibilities**:
  - Declare disaster
  - Coordinate recovery efforts
  - Make critical decisions
  - Communicate with stakeholders

#### Database Administrator
- **Primary**: Senior Backend Engineer
- **Backup**: DevOps Engineer
- **Responsibilities**:
  - Execute database recovery procedures
  - Verify data integrity
  - Optimize database performance post-recovery

#### Infrastructure Engineer
- **Primary**: DevOps Engineer
- **Backup**: Senior Backend Engineer
- **Responsibilities**:
  - Provision infrastructure
  - Deploy services
  - Configure networking and security

#### Application Engineer
- **Primary**: Backend Team Lead
- **Backup**: Senior Backend Engineer
- **Responsibilities**:
  - Deploy application services
  - Verify application functionality
  - Fix any application-level issues

#### Communications Lead
- **Primary**: Product Manager
- **Backup**: Customer Success Manager
- **Responsibilities**:
  - Communicate with users
  - Update status page
  - Coordinate internal communications

### Contact Information

```
Incident Commander:
  - Name: [Name]
  - Phone: [Phone]
  - Email: [Email]
  - Slack: @[username]

Database Administrator:
  - Name: [Name]
  - Phone: [Phone]
  - Email: [Email]
  - Slack: @[username]

[Additional contacts...]
```

### Escalation Path

1. **Level 1**: On-call engineer
2. **Level 2**: Team lead
3. **Level 3**: Engineering manager
4. **Level 4**: CTO
5. **Level 5**: CEO

## Communication Plan

### Internal Communication

#### During Incident
- **Primary Channel**: Dedicated Slack channel `#incident-response`
- **Backup Channel**: Phone conference bridge
- **Update Frequency**: Every 30 minutes minimum
- **Status Updates**: Include current status, actions taken, next steps, ETA

#### Post-Incident
- **Incident Report**: Within 24 hours
- **Post-Mortem**: Within 1 week
- **Action Items**: Tracked in project management tool

### External Communication

#### Status Page
- **URL**: status.ai-tutor.com
- **Update Frequency**: Every 30 minutes during incident
- **Components to Track**:
  - Web Application
  - API Services
  - AI Service
  - Database Services
  - Authentication

#### User Communication
- **Channels**: Email, in-app notifications, social media
- **Initial Notification**: Within 15 minutes of incident detection
- **Update Frequency**: Every hour during incident
- **Resolution Notification**: Within 30 minutes of resolution

#### Template Messages

**Initial Notification**:
```
We are currently experiencing technical difficulties with the AI Tutoring Platform. 
Our team is actively working to resolve the issue. We will provide updates every hour.
We apologize for any inconvenience.
```

**Update**:
```
Update: We are continuing to work on resolving the technical issue. 
Current status: [brief description]
Estimated resolution: [time]
```

**Resolution**:
```
The technical issue has been resolved. All services are now operational.
We apologize for the disruption and thank you for your patience.
If you continue to experience issues, please contact support.
```

## Appendix

### Useful Commands

#### Check Backup Status
```bash
# List recent backups in S3
aws s3 ls s3://ai-tutor-backups/production/postgres/ --recursive | tail -10
aws s3 ls s3://ai-tutor-backups/production/mongodb/ --recursive | tail -10

# Check local backups
ls -lh /backups/postgres/ | tail -10
ls -lh /backups/mongodb/ | tail -10
```

#### Database Health Checks
```bash
# PostgreSQL
PGPASSWORD="${DB_PASSWORD}" psql -h postgres-service -U postgres -d ai_tutor -c "SELECT version();"
PGPASSWORD="${DB_PASSWORD}" psql -h postgres-service -U postgres -d ai_tutor -c "SELECT COUNT(*) FROM users;"

# MongoDB
mongosh --host mongodb-service --username mongo --password "${MONGO_PASSWORD}" --authenticationDatabase admin --eval "db.serverStatus()"
mongosh --host mongodb-service --username mongo --password "${MONGO_PASSWORD}" --authenticationDatabase admin --eval "db.tests.countDocuments()"

# Redis
redis-cli -h redis-service -a "${REDIS_PASSWORD}" PING
redis-cli -h redis-service -a "${REDIS_PASSWORD}" INFO stats
```

#### Service Health Checks
```bash
# Check all pods
kubectl get pods -n ai-tutoring-platform

# Check specific service
kubectl logs -n ai-tutoring-platform -l app=auth-service --tail=100

# Check service endpoints
kubectl get endpoints -n ai-tutoring-platform
```

### Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [CLOUD_INFRASTRUCTURE.md](./CLOUD_INFRASTRUCTURE.md) - Infrastructure details
- [DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md) - Database configuration
- [SETUP.md](./SETUP.md) - Initial setup procedures

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-01 | DevOps Team | Initial version |

---

**Last Updated**: 2024-01-01  
**Next Review Date**: 2024-04-01  
**Document Owner**: DevOps Lead
