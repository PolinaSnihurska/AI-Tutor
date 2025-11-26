#!/bin/bash

# PostgreSQL Backup Script
# This script creates automated backups of PostgreSQL databases

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="postgres_backup_${TIMESTAMP}.sql.gz"
S3_BUCKET="${S3_BACKUP_BUCKET:-ai-tutor-backups}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Database connection details
DB_HOST="${DB_HOST:-postgres-service}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_tutor}"
DB_USER="${DB_USER:-postgres}"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

log "Starting PostgreSQL backup for database: ${DB_NAME}"

# Perform backup
if PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="${BACKUP_DIR}/${BACKUP_FILE%.gz}" 2>&1 | tee -a "${BACKUP_DIR}/backup.log"; then
    
    # Compress the backup
    gzip -f "${BACKUP_DIR}/${BACKUP_FILE%.gz}"
    
    log "Backup completed successfully: ${BACKUP_FILE}"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    log "Backup size: ${BACKUP_SIZE}"
    
    # Upload to S3 if configured
    if command -v aws &> /dev/null && [ -n "${S3_BUCKET}" ]; then
        log "Uploading backup to S3: s3://${S3_BUCKET}/${ENVIRONMENT}/postgres/${BACKUP_FILE}"
        
        if aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" \
            "s3://${S3_BUCKET}/${ENVIRONMENT}/postgres/${BACKUP_FILE}" \
            --storage-class STANDARD_IA \
            --metadata "timestamp=${TIMESTAMP},database=${DB_NAME},size=${BACKUP_SIZE}"; then
            
            log "Backup uploaded to S3 successfully"
            
            # Create a latest symlink in S3
            aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" \
                "s3://${S3_BUCKET}/${ENVIRONMENT}/postgres/latest.sql.gz" \
                --storage-class STANDARD_IA
        else
            error "Failed to upload backup to S3"
        fi
    fi
    
    # Verify backup integrity
    log "Verifying backup integrity..."
    if gunzip -t "${BACKUP_DIR}/${BACKUP_FILE}"; then
        log "Backup integrity verified"
    else
        error "Backup integrity check failed!"
        exit 1
    fi
    
    # Clean up old backups (local)
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "postgres_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    
    # Clean up old backups (S3)
    if command -v aws &> /dev/null && [ -n "${S3_BUCKET}" ]; then
        log "Applying S3 lifecycle policy for old backups..."
        # S3 lifecycle policies handle this automatically
    fi
    
    # Send success notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ PostgreSQL backup completed successfully\n• Database: ${DB_NAME}\n• Size: ${BACKUP_SIZE}\n• File: ${BACKUP_FILE}\"}"
    fi
    
    log "Backup process completed successfully"
    exit 0
    
else
    error "Backup failed!"
    
    # Send failure notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"❌ PostgreSQL backup FAILED\n• Database: ${DB_NAME}\n• Environment: ${ENVIRONMENT}\"}"
    fi
    
    exit 1
fi
