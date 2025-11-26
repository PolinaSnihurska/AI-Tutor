#!/bin/bash

# PostgreSQL Restore Script
# This script restores PostgreSQL databases from backups

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
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

# Usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -f, --file FILE       Restore from specific backup file"
    echo "  -l, --latest          Restore from latest backup"
    echo "  -s, --s3              Download backup from S3"
    echo "  -d, --date DATE       Restore from backup on specific date (YYYYMMDD)"
    echo "  --no-confirm          Skip confirmation prompt"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --latest                                    # Restore from latest local backup"
    echo "  $0 --file postgres_backup_20240101_120000.sql.gz  # Restore from specific file"
    echo "  $0 --latest --s3                               # Restore from latest S3 backup"
    echo "  $0 --date 20240101 --s3                        # Restore from specific date in S3"
    exit 1
}

# Parse arguments
BACKUP_FILE=""
USE_LATEST=false
USE_S3=false
BACKUP_DATE=""
NO_CONFIRM=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -l|--latest)
            USE_LATEST=true
            shift
            ;;
        -s|--s3)
            USE_S3=true
            shift
            ;;
        -d|--date)
            BACKUP_DATE="$2"
            shift 2
            ;;
        --no-confirm)
            NO_CONFIRM=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            error "Unknown option: $1"
            usage
            ;;
    esac
done

# Determine backup file to restore
if [ "${USE_S3}" = true ]; then
    if [ "${USE_LATEST}" = true ]; then
        log "Downloading latest backup from S3..."
        BACKUP_FILE="latest.sql.gz"
        aws s3 cp "s3://${S3_BUCKET}/${ENVIRONMENT}/postgres/latest.sql.gz" "${BACKUP_DIR}/latest.sql.gz"
    elif [ -n "${BACKUP_DATE}" ]; then
        log "Searching for backup from date: ${BACKUP_DATE}"
        BACKUP_FILE=$(aws s3 ls "s3://${S3_BUCKET}/${ENVIRONMENT}/postgres/" | grep "${BACKUP_DATE}" | awk '{print $4}' | head -1)
        if [ -z "${BACKUP_FILE}" ]; then
            error "No backup found for date: ${BACKUP_DATE}"
            exit 1
        fi
        log "Found backup: ${BACKUP_FILE}"
        aws s3 cp "s3://${S3_BUCKET}/${ENVIRONMENT}/postgres/${BACKUP_FILE}" "${BACKUP_DIR}/${BACKUP_FILE}"
    elif [ -n "${BACKUP_FILE}" ]; then
        log "Downloading specified backup from S3: ${BACKUP_FILE}"
        aws s3 cp "s3://${S3_BUCKET}/${ENVIRONMENT}/postgres/${BACKUP_FILE}" "${BACKUP_DIR}/${BACKUP_FILE}"
    else
        error "Please specify --latest, --date, or --file when using --s3"
        usage
    fi
elif [ "${USE_LATEST}" = true ]; then
    log "Finding latest local backup..."
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/postgres_backup_*.sql.gz 2>/dev/null | head -1 | xargs basename)
    if [ -z "${BACKUP_FILE}" ]; then
        error "No local backups found in ${BACKUP_DIR}"
        exit 1
    fi
    log "Found latest backup: ${BACKUP_FILE}"
elif [ -z "${BACKUP_FILE}" ]; then
    error "Please specify a backup file, use --latest, or provide a date"
    usage
fi

# Full path to backup file
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Check if backup file exists
if [ ! -f "${BACKUP_PATH}" ]; then
    error "Backup file not found: ${BACKUP_PATH}"
    exit 1
fi

log "Backup file: ${BACKUP_PATH}"
log "Backup size: $(du -h "${BACKUP_PATH}" | cut -f1)"

# Confirmation prompt
if [ "${NO_CONFIRM}" = false ]; then
    echo ""
    echo "WARNING: This will restore the database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}"
    echo "All current data will be replaced with the backup data."
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    
    if [ "${CONFIRM}" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi
fi

log "Starting PostgreSQL restore..."

# Create a pre-restore backup
log "Creating pre-restore backup..."
PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=custom \
    --compress=9 \
    --file="${PRE_RESTORE_BACKUP%.gz}"
gzip -f "${PRE_RESTORE_BACKUP%.gz}"
log "Pre-restore backup saved: ${PRE_RESTORE_BACKUP}"

# Terminate existing connections
log "Terminating existing database connections..."
PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

# Drop and recreate database
log "Dropping and recreating database..."
PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME};"

PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
log "Restoring database from backup..."
if gunzip -c "${BACKUP_PATH}" | PGPASSWORD="${DB_PASSWORD}" pg_restore \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --verbose \
    --no-owner \
    --no-acl 2>&1 | tee -a "${BACKUP_DIR}/restore.log"; then
    
    log "Database restored successfully"
    
    # Verify restoration
    log "Verifying restoration..."
    TABLE_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    
    log "Tables restored: ${TABLE_COUNT}"
    
    # Send success notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ PostgreSQL restore completed successfully\n• Database: ${DB_NAME}\n• Backup: ${BACKUP_FILE}\n• Tables: ${TABLE_COUNT}\"}"
    fi
    
    log "Restore process completed successfully"
    exit 0
    
else
    error "Restore failed!"
    
    log "Attempting to restore from pre-restore backup..."
    gunzip -c "${PRE_RESTORE_BACKUP}" | PGPASSWORD="${DB_PASSWORD}" pg_restore \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --verbose \
        --no-owner \
        --no-acl
    
    # Send failure notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"❌ PostgreSQL restore FAILED\n• Database: ${DB_NAME}\n• Backup: ${BACKUP_FILE}\n• Rolled back to pre-restore state\"}"
    fi
    
    exit 1
fi
