#!/bin/bash

# MongoDB Backup Script
# This script creates automated backups of MongoDB databases

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/mongodb}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_${TIMESTAMP}"
S3_BUCKET="${S3_BACKUP_BUCKET:-ai-tutor-backups}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Database connection details
MONGO_HOST="${MONGO_HOST:-mongodb-service}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-ai_tutor}"
MONGO_USER="${MONGO_USER:-mongo}"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

log "Starting MongoDB backup for database: ${MONGO_DB}"

# Perform backup
if mongodump \
    --host="${MONGO_HOST}" \
    --port="${MONGO_PORT}" \
    --username="${MONGO_USER}" \
    --password="${MONGO_PASSWORD}" \
    --db="${MONGO_DB}" \
    --authenticationDatabase=admin \
    --out="${BACKUP_DIR}/${BACKUP_NAME}" \
    --gzip \
    --verbose 2>&1 | tee -a "${BACKUP_DIR}/backup.log"; then
    
    log "Backup completed successfully: ${BACKUP_NAME}"
    
    # Create tarball
    log "Creating tarball..."
    tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
    log "Backup size: ${BACKUP_SIZE}"
    
    # Remove uncompressed backup directory
    rm -rf "${BACKUP_DIR}/${BACKUP_NAME}"
    
    # Upload to S3 if configured
    if command -v aws &> /dev/null && [ -n "${S3_BUCKET}" ]; then
        log "Uploading backup to S3: s3://${S3_BUCKET}/${ENVIRONMENT}/mongodb/${BACKUP_NAME}.tar.gz"
        
        if aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
            "s3://${S3_BUCKET}/${ENVIRONMENT}/mongodb/${BACKUP_NAME}.tar.gz" \
            --storage-class STANDARD_IA \
            --metadata "timestamp=${TIMESTAMP},database=${MONGO_DB},size=${BACKUP_SIZE}"; then
            
            log "Backup uploaded to S3 successfully"
            
            # Create a latest symlink in S3
            aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
                "s3://${S3_BUCKET}/${ENVIRONMENT}/mongodb/latest.tar.gz" \
                --storage-class STANDARD_IA
        else
            error "Failed to upload backup to S3"
        fi
    fi
    
    # Verify backup integrity
    log "Verifying backup integrity..."
    if tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" > /dev/null; then
        log "Backup integrity verified"
    else
        error "Backup integrity check failed!"
        exit 1
    fi
    
    # Clean up old backups (local)
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "mongodb_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
    
    # Send success notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ MongoDB backup completed successfully\n• Database: ${MONGO_DB}\n• Size: ${BACKUP_SIZE}\n• File: ${BACKUP_NAME}.tar.gz\"}"
    fi
    
    log "Backup process completed successfully"
    exit 0
    
else
    error "Backup failed!"
    
    # Send failure notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"❌ MongoDB backup FAILED\n• Database: ${MONGO_DB}\n• Environment: ${ENVIRONMENT}\"}"
    fi
    
    exit 1
fi
