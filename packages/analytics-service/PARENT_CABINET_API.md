# Parent Cabinet API Implementation

This document describes the parent cabinet API endpoints implemented for task 9.4.

## Overview

The parent cabinet API provides endpoints for parents to monitor their children's learning activities, view analytics, manage notification preferences, and control parental settings.

## Endpoints

### Analytics Service (`/api/parent`)

#### 1. Get Child Analytics
**Endpoint:** `GET /api/parent/children/:childId/analytics`

**Description:** Get comprehensive analytics for a specific child including study time, performance by subject, weak topics, recommendations, and goal comparison.

**Query Parameters:**
- `startDate` (required): Start date for analytics period (ISO 8601 format or YYYY-MM-DD)
- `endDate` (required): End date for analytics period (ISO 8601 format or YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "childId": "uuid",
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z"
    },
    "studyTime": {
      "totalMinutes": 1200,
      "dailyAverage": 40,
      "weeklyTrend": [30, 45, 50, 35, 40, 55, 45]
    },
    "performanceBySubject": [
      {
        "subject": "Mathematics",
        "score": 75.5,
        "testsCompleted": 10,
        "trend": "improving"
      }
    ],
    "weakTopics": [
      "Mathematics: Algebra",
      "Physics: Mechanics"
    ],
    "recommendations": [
      "Focus on improving performance in: Mathematics",
      "Great progress in: English"
    ],
    "comparisonToGoals": {
      "targetScore": 80,
      "currentScore": 75,
      "onTrack": true,
      "daysRemaining": 45
    }
  }
}
```

**Requirements Addressed:** 5.1, 5.2, 5.4

---

#### 2. Get Aggregated Analytics
**Endpoint:** `GET /api/parent/children/aggregated`

**Description:** Get aggregated analytics for multiple children (useful for parents with multiple children).

**Query Parameters:**
- `childIds` (required): Comma-separated list of child UUIDs
- `startDate` (required): Start date for analytics period
- `endDate` (required): End date for analytics period

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStudyTime": 2400,
    "averagePerformance": 78,
    "childrenNeedingAttention": ["uuid1", "uuid2"]
  }
}
```

**Requirements Addressed:** 5.1, 5.2

---

### Auth Service (`/api/parent`)

#### 3. Get Children
**Endpoint:** `GET /api/parent/children`

**Description:** Get list of all children linked to the parent account.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "age": 15,
      "grade": 10,
      "subjects": ["Mathematics", "Physics", "English"],
      "last_active": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Requirements Addressed:** 5.1

---

#### 4. Get Notification Preferences
**Endpoint:** `GET /api/parent/notification-preferences`

**Description:** Get parent's notification preferences.

**Response:**
```json
{
  "success": true,
  "data": {
    "email": true,
    "inApp": true,
    "taskReminders": true,
    "weeklyReports": true,
    "performanceAlerts": true,
    "dailySummary": false
  }
}
```

**Requirements Addressed:** 5.3

---

#### 5. Update Notification Preferences
**Endpoint:** `PUT /api/parent/notification-preferences`

**Description:** Update parent's notification preferences.

**Request Body:**
```json
{
  "email": true,
  "inApp": true,
  "taskReminders": false,
  "weeklyReports": true,
  "performanceAlerts": true,
  "dailySummary": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": true,
    "inApp": true,
    "taskReminders": false,
    "weeklyReports": true,
    "performanceAlerts": true,
    "dailySummary": true
  },
  "message": "Notification preferences updated successfully"
}
```

**Requirements Addressed:** 5.3

---

#### 6. Get Parental Controls
**Endpoint:** `GET /api/parent/children/:childId/controls`

**Description:** Get parental control settings for a specific child.

**Response:**
```json
{
  "success": true,
  "data": {
    "parentId": "uuid",
    "childId": "uuid",
    "dailyTimeLimitMinutes": 120,
    "contentRestrictions": [],
    "allowedSubjects": null,
    "blockedFeatures": [],
    "active": true
  }
}
```

**Requirements Addressed:** 5.3

---

#### 7. Update Parental Controls
**Endpoint:** `PUT /api/parent/children/:childId/controls`

**Description:** Update parental control settings for a specific child.

**Request Body:**
```json
{
  "dailyTimeLimitMinutes": 90,
  "contentRestrictions": ["social"],
  "allowedSubjects": ["Mathematics", "Physics"],
  "blockedFeatures": ["chat"],
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "parentId": "uuid",
    "childId": "uuid",
    "dailyTimeLimitMinutes": 90,
    "contentRestrictions": ["social"],
    "allowedSubjects": ["Mathematics", "Physics"],
    "blockedFeatures": ["chat"],
    "active": true
  },
  "message": "Parental controls updated successfully"
}
```

**Requirements Addressed:** 5.3

---

#### 8. Get Child Activity Log
**Endpoint:** `GET /api/parent/children/:childId/activity-log`

**Description:** Get activity log for a child showing all learning activities.

**Query Parameters:**
- `startDate` (optional): Start date (defaults to 7 days ago)
- `endDate` (optional): End date (defaults to now)
- `limit` (optional): Maximum number of records (max 500, default 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "childId": "uuid",
      "activityType": "test_completed",
      "activityDetails": {
        "testId": "uuid",
        "score": 85,
        "subject": "Mathematics"
      },
      "durationMinutes": 45,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "flagged": false,
      "flagReason": null
    }
  ]
}
```

**Requirements Addressed:** 5.3

---

#### 9. Get Learning Time Monitoring
**Endpoint:** `GET /api/parent/children/:childId/learning-time`

**Description:** Get detailed learning time monitoring data for a child.

**Query Parameters:**
- `days` (optional): Number of days to retrieve (max 90, default 7)

**Response:**
```json
{
  "success": true,
  "data": {
    "dailyData": [
      {
        "date": "2024-01-15",
        "minutes": 45,
        "activities": 3
      }
    ],
    "timeLimit": {
      "limitMinutes": 120,
      "usedMinutes": 45,
      "exceeded": false
    },
    "totalMinutes": 315,
    "averageMinutesPerDay": 45
  }
}
```

**Requirements Addressed:** 5.3

---

## Authentication & Authorization

All endpoints require:
1. **Authentication**: Valid JWT token in Authorization header (`Bearer <token>`)
2. **Parent Role**: User must have the `parent` role
3. **Parent-Child Link**: For child-specific endpoints, the parent must be linked to the child

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [...]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied: Not linked to this child"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to get child analytics"
}
```

## Implementation Details

### Files Created/Modified

**Analytics Service:**
- `packages/analytics-service/src/routes/parentRoutes.ts` (new)
- `packages/analytics-service/src/index.ts` (modified)

**Auth Service:**
- `packages/auth-service/src/controllers/parentController.ts` (new)
- `packages/auth-service/src/routes/parentRoutes.ts` (new)
- `packages/auth-service/src/index.ts` (modified)

### Services Used

- `ParentAnalyticsService`: Provides child analytics and aggregated data
- `ParentalControlService`: Manages parental controls and activity monitoring
- `ParentChildLink`: Verifies parent-child relationships
- `User`: Manages user profiles and preferences

## Testing

To test these endpoints:

1. **Start the services:**
   ```bash
   npm run dev
   ```

2. **Authenticate as a parent:**
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "parent@example.com", "password": "password"}'
   ```

3. **Get children list:**
   ```bash
   curl http://localhost:3001/parent/children \
     -H "Authorization: Bearer <token>"
   ```

4. **Get child analytics:**
   ```bash
   curl "http://localhost:3004/api/parent/children/<childId>/analytics?startDate=2024-01-01&endDate=2024-01-31" \
     -H "Authorization: Bearer <token>"
   ```

5. **Update notification preferences:**
   ```bash
   curl -X PUT http://localhost:3001/parent/notification-preferences \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"email": true, "inApp": true, "taskReminders": true, "weeklyReports": true}'
   ```

## Requirements Coverage

✅ **Requirement 5.1**: Parent can view child's learning statistics
- Implemented via child analytics endpoint with comprehensive metrics

✅ **Requirement 5.2**: Parent can see performance by subject
- Included in child analytics with subject scores and trends

✅ **Requirement 5.3**: Parent can control and monitor learning time
- Implemented via parental controls, activity log, and learning time monitoring endpoints
- Notification preferences allow parents to customize alerts

✅ **Requirement 5.4**: Parent can see weak topics and recommendations
- Included in child analytics with weak topics identification and personalized recommendations
