# GDPR Compliance Implementation

## Overview

This document describes the GDPR compliance features implemented in the auth service, fulfilling requirements 9.2 and 9.4 from the AI Tutoring Platform specification.

## Features Implemented

### 1. Consent Management

**Endpoints:**
- `POST /gdpr/consent` - Record user consent
- `GET /gdpr/consent/current` - Get current consent status
- `GET /gdpr/consent/history` - Get consent history

**Consent Types:**
- `terms` - Terms of Service
- `privacy` - Privacy Policy
- `marketing` - Marketing Communications
- `analytics` - Analytics and Tracking

**Features:**
- Records IP address and user agent for audit trail
- Maintains complete consent history
- Supports consent withdrawal

### 2. Data Export (Right to Data Portability)

**Endpoints:**
- `POST /gdpr/export` - Request data export
- `GET /gdpr/export/:requestId` - Check export status
- `GET /gdpr/export/download` - Download exported data

**Exported Data Includes:**
- User profile information
- Subscription history
- Learning plans
- Test results
- Analytics data
- Consent history
- Parent-child relationships
- Usage tracking data

**Features:**
- Comprehensive data export in JSON format
- Secure download with authentication
- Export request tracking

### 3. Data Deletion (Right to be Forgotten)

**Endpoints:**
- `POST /gdpr/delete` - Request data deletion
- `GET /gdpr/delete/:requestId` - Check deletion status
- `DELETE /gdpr/delete/:requestId` - Cancel deletion request

**Features:**
- 30-day grace period before deletion
- Ability to cancel during grace period
- Complete data removal from all tables
- Cascading deletion across related data
- Redis cache cleanup
- Session termination

**Deletion Process:**
1. User submits deletion request
2. Request is scheduled for 30 days in the future
3. User can cancel during grace period
4. Automated job processes scheduled deletions daily
5. All user data is permanently removed

### 4. Database Schema

**New Tables:**

```sql
-- User consents
CREATE TABLE user_consents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  consent_type VARCHAR(50),
  granted BOOLEAN,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP
);

-- Data export requests
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20),
  requested_at TIMESTAMP,
  completed_at TIMESTAMP,
  download_url TEXT,
  expires_at TIMESTAMP
);

-- Data deletion requests
CREATE TABLE data_deletion_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20),
  requested_at TIMESTAMP,
  scheduled_for TIMESTAMP,
  reason TEXT
);
```

### 5. Scheduled Jobs

**Daily Jobs:**
- **3:00 AM** - Process scheduled data deletions
- **4:00 AM** - Clean up expired sessions

**Manual Triggers:**
- `ScheduledJobsService.triggerGDPRDeletions()` - Process deletions immediately
- `ScheduledJobsService.triggerSessionCleanup()` - Clean up sessions immediately

## Security Features

### Authentication
- All GDPR endpoints require authentication
- JWT token validation
- User can only access their own data

### Authorization
- Request ownership verification
- Parent-child relationship validation
- Role-based access control

### Audit Trail
- IP address logging for consent actions
- User agent tracking
- Timestamp recording for all actions
- Complete history maintenance

### Data Protection
- Encrypted data at rest (AES-256-GCM)
- TLS 1.3 for data in transit
- Secure session management
- Redis-based session storage with encryption

## Usage Examples

### Recording Consent

```typescript
POST /gdpr/consent
Authorization: Bearer <token>
Content-Type: application/json

{
  "consentType": "terms",
  "granted": true
}
```

### Requesting Data Export

```typescript
POST /gdpr/export
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Data export request submitted successfully",
  "data": {
    "requestId": "uuid",
    "estimatedTime": "24-48 hours"
  }
}
```

### Downloading Data

```typescript
GET /gdpr/export/download
Authorization: Bearer <token>

Response: JSON file with all user data
```

### Requesting Data Deletion

```typescript
POST /gdpr/delete
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "No longer using the service"
}

Response:
{
  "success": true,
  "message": "Data deletion request submitted successfully",
  "data": {
    "requestId": "uuid",
    "gracePeriod": "30 days",
    "scheduledFor": "2025-12-23T00:00:00.000Z"
  }
}
```

### Canceling Deletion

```typescript
DELETE /gdpr/delete/:requestId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Data deletion request cancelled successfully"
}
```

## Compliance Checklist

- ✅ Right to Access - Users can view their data
- ✅ Right to Data Portability - Users can export their data
- ✅ Right to be Forgotten - Users can request data deletion
- ✅ Right to Rectification - Users can update their profile
- ✅ Consent Management - Users can grant/withdraw consent
- ✅ Audit Trail - All actions are logged with timestamps
- ✅ Data Minimization - Only necessary data is collected
- ✅ Data Security - Encryption at rest and in transit
- ✅ Breach Notification - Monitoring and alerting in place
- ✅ Privacy by Design - GDPR considerations from the start

## Testing

Integration tests are provided in `src/__tests__/gdpr.integration.test.ts`:

```bash
npm test -- gdpr.integration.test.ts
```

**Test Coverage:**
- Consent recording and retrieval
- Data export requests
- Data deletion requests
- Authentication and authorization
- Error handling

## Migration

To apply the GDPR tables:

```bash
npm run migrate
```

This will run migration `007_create_gdpr_tables.sql`.

## Monitoring

**Metrics to Monitor:**
- Number of data export requests
- Number of data deletion requests
- Consent grant/withdrawal rates
- Failed deletion attempts
- Export processing time

**Alerts:**
- Failed scheduled deletions
- High volume of deletion requests
- Export processing failures

## Future Enhancements

1. **Automated Export Generation** - Background job to generate exports
2. **Export Expiration** - Auto-delete exports after 7 days
3. **Anonymization Option** - Allow data anonymization instead of deletion
4. **Consent Preferences UI** - Granular consent management interface
5. **Data Retention Policies** - Automated cleanup of old data
6. **GDPR Dashboard** - Admin view of GDPR requests and compliance status

## References

- GDPR Official Text: https://gdpr-info.eu/
- Requirements: 9.2, 9.4 in requirements.md
- Design: Security Considerations in design.md

