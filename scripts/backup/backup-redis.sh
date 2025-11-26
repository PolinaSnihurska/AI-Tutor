#!/bin/bash

# Redis Backup Script
# This script creates automated backups of Redis data

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/redis}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="redis_backup_${TIMESTAMP}.rdb"
S3_BUCKET="${S3_BACKUP_BUCKET:-ai-tutor-backups}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Redis connection details
REDIS_HOST="${REDIS_HOST:-redis-service}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

log "Starting Redis backup"

# Trigger Redis BGSAVE
if [ -n "${REDIS_PASSWORD}" ]; then
    REDIS_CLI_CMD="redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} -a ${REDIS_PASSWORD}"
else
    REDIS_CLI_CMD="redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT}"
fi

# Trigger background save
log "Triggering Redis BGSAVE..."
if ${REDIS_CLI_CMD} BGSAVE; then
    log "BGSAVE triggered successfully"
    
    # Wait for BGSAVE to complete
    while true; do
        LASTSAVE=$(${REDIS_CLI_CMD} LASTSAVE)
        sleep 2
        NEWSAVE=$(${REDIS_CLI_CMD} LASTSAVE)
        
        if [ "${NEWSAVE}" -gt "${LASTSAVE}" ]; then
            log "BGSAVE completed"
            break
        fi
        
        # Check if BGSAVE is still in progress
        INFO=$(${REDIS_CLI_CMD} INFO persistence | grep rdb_bgsave_in_progress)
        if echo "${INFO}" | grep -q "rdb_bgsave_in_progress:0"; then
            log "BGSAVE completed"
            break
        fi
        
        sleep 5
    done
    
    # Copy RDB file
    log "Copying RDB file..."
    
    # For Kubernetes, we need to copy from the pod
    if command -v kubectl &> /dev/null; then
        REDIS_POD=$(kubectl get pods -n ai-tutoring-platform -l app=redis -o jsonpath='{.items[0].metadata.name}')
        kubectl cp "ai-tutoring-platform/${REDIS_POD}:/data/dump.rdb" "${BACKUP_DIR}/${BACKUP_FILE}"
    else
        # For Docker, copy from volume
        cp /data/dump.rdb "${BACKUP_DIR}/${BACKUP_FILE}"
    fi
    
    # Compress the backup
    log "Compressing backup..."
    gzip -f "${BACKUP_DIR}/${BACKUP_FILE}"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    log "Backup size: ${BACKUP_SIZE}"
    
    # Upload to S3 if configured
    if command -v aws &> /dev/null && [ -n "${S3_BUCKET}" ]; then
        log "Uploading backup to S3: s3://${S3_BUCKET}/${ENVIRONMENT}/redis/${BACKUP_FILE}"
        
        if aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" \
            "s3://${S3_BUCKET}/${ENVIRONMENT}/redis/${BACKUP_FILE}" \
            --storage-class STANDARD_IA \
            --metadata "timestamp=${TIMESTAMP},size=${BACKUP_SIZE}"; then
            
            log "Backup uploaded to S3 successfully"
            
            # Create a latest symlink in S3
            aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" \
                "s3://${S3_BUCKET}/${ENVIRONMENT}/redis/latest.rdb.gz" \
                --storage-class STANDARD_IA
        else
            error "Failed to upload backup to S3"
        fi
    fi
    
    # Clean up old backups (local)
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "redis_backup_*.rdb.gz" -type f -mtime +${RETENTION_DAYS} -delete
    
    # Send success notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ Redis backup completed successfully\n• Size: ${BACKUP_SIZE}\n• File: ${BACKUP_FILE}\"}"
    fi
    
    log "Backup process completed successfully"
    exit 0
    
else
    error "Redis BGSAVE failed!"
    
    # Send failure notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"❌ Redis backup FAILED\n• Environment: ${ENVIRONMENT}\"}"
    fi
    
    exit 1
fi
