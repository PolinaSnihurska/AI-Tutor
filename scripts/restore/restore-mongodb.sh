#!/bin/bash

# MongoDB Restore Script
# This script restores MongoDB databases from backups

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/mongodb}"
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
    echo "  --drop                Drop existing collections before restore"
    echo "  -h, --help            Show this help message"
    exit 1
}

# Parse arguments
BACKUP_FILE=""
USE_LATEST=false
USE_S3=false
BACKUP_DATE=""
NO_CONFIRM=false
DROP_COLLECTIONS=false

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
        --drop)
            DROP_COLLECTIONS=true
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
        BACKUP_FILE="latest.tar.gz"
        aws s3 cp "s3://${S3_BUCKET}/${ENVIRONMENT}/mongodb/latest.tar.gz" "${BACKUP_DIR}/latest.tar.gz"
    elif [ -n "${BACKUP_DATE}" ]; then
        log "Searching for backup from date: ${BACKUP_DATE}"
        BACKUP_FILE=$(aws s3 ls "s3://${S3_BUCKET}/${ENVIRONMENT}/mongodb/" | grep "${BACKUP_DATE}" | awk '{print $4}' | head -1)
        if [ -z "${BACKUP_FILE}" ]; then
            error "No backup found for date: ${BACKUP_DATE}"
            exit 1
        fi
        log "Found backup: ${BACKUP_FILE}"
        aws s3 cp "s3://${S3_BUCKET}/${ENVIRONMENT}/mongodb/${BACKUP_FILE}" "${BACKUP_DIR}/${BACKUP_FILE}"
    elif [ -n "${BACKUP_FILE}" ]; then
        log "Downloading specified backup from S3: ${BACKUP_FILE}"
        aws s3 cp "s3://${S3_BUCKET}/${ENVIRONMENT}/mongodb/${BACKUP_FILE}" "${BACKUP_DIR}/${BACKUP_FILE}"
    else
        error "Please specify --latest, --date, or --file when using --s3"
        usage
    fi
elif [ "${USE_LATEST}" = true ]; then
    log "Finding latest local backup..."
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/mongodb_backup_*.tar.gz 2>/dev/null | head -1 | xargs basename)
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
    echo "WARNING: This will restore the database '${MONGO_DB}' on ${MONGO_HOST}:${MONGO_PORT}"
    if [ "${DROP_COLLECTIONS}" = true ]; then
        echo "Existing collections will be DROPPED before restore."
    else
        echo "Existing data will be merged with backup data."
    fi
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    
    if [ "${CONFIRM}" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi
fi

log "Starting MongoDB restore..."

# Extract backup
EXTRACT_DIR="${BACKUP_DIR}/restore_temp_$(date +%Y%m%d_%H%M%S)"
mkdir -p "${EXTRACT_DIR}"
log "Extracting backup to ${EXTRACT_DIR}..."
tar -xzf "${BACKUP_PATH}" -C "${EXTRACT_DIR}"

# Find the backup directory
BACKUP_DATA_DIR=$(find "${EXTRACT_DIR}" -type d -name "${MONGO_DB}" | head -1)
if [ -z "${BACKUP_DATA_DIR}" ]; then
    error "Could not find database directory in backup"
    rm -rf "${EXTRACT_DIR}"
    exit 1
fi

# Build mongorestore command
RESTORE_CMD="mongorestore"
RESTORE_CMD="${RESTORE_CMD} --host=${MONGO_HOST}"
RESTORE_CMD="${RESTORE_CMD} --port=${MONGO_PORT}"
RESTORE_CMD="${RESTORE_CMD} --username=${MONGO_USER}"
RESTORE_CMD="${RESTORE_CMD} --password=${MONGO_PASSWORD}"
RESTORE_CMD="${RESTORE_CMD} --authenticationDatabase=admin"
RESTORE_CMD="${RESTORE_CMD} --db=${MONGO_DB}"
RESTORE_CMD="${RESTORE_CMD} --gzip"
RESTORE_CMD="${RESTORE_CMD} --verbose"

if [ "${DROP_COLLECTIONS}" = true ]; then
    RESTORE_CMD="${RESTORE_CMD} --drop"
fi

# Restore from backup
log "Restoring database from backup..."
if ${RESTORE_CMD} "${BACKUP_DATA_DIR}" 2>&1 | tee -a "${BACKUP_DIR}/restore.log"; then
    
    log "Database restored successfully"
    
    # Verify restoration
    log "Verifying restoration..."
    COLLECTION_COUNT=$(mongosh \
        --host "${MONGO_HOST}" \
        --port "${MONGO_PORT}" \
        --username "${MONGO_USER}" \
        --password "${MONGO_PASSWORD}" \
        --authenticationDatabase admin \
        --eval "db.getSiblingDB('${MONGO_DB}').getCollectionNames().length" \
        --quiet)
    
    log "Collections restored: ${COLLECTION_COUNT}"
    
    # Clean up
    log "Cleaning up temporary files..."
    rm -rf "${EXTRACT_DIR}"
    
    # Send success notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ MongoDB restore completed successfully\n• Database: ${MONGO_DB}\n• Backup: ${BACKUP_FILE}\n• Collections: ${COLLECTION_COUNT}\"}"
    fi
    
    log "Restore process completed successfully"
    exit 0
    
else
    error "Restore failed!"
    
    # Clean up
    rm -rf "${EXTRACT_DIR}"
    
    # Send failure notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"❌ MongoDB restore FAILED\n• Database: ${MONGO_DB}\n• Backup: ${BACKUP_FILE}\"}"
    fi
    
    exit 1
fi
