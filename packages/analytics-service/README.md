# Analytics Service

The Analytics Service provides comprehensive analytics, progress tracking, heatmap generation, and predictive analytics for the AI Tutoring Platform.

## Features

### 1. Analytics Database Schema
- **analytics_snapshots**: Daily performance snapshots with overall scores, subject scores, and study metrics
- **student_activities**: Real-time event tracking for all student activities
- **topic_performance**: Topic-level performance tracking for heatmap generation
- **predictions**: Success predictions with confidence scores and recommendations

### 2. Event Tracking System
- Real-time activity tracking for all student events
- Automatic topic performance updates
- Redis pub/sub for real-time updates
- WebSocket support for live dashboard updates

### 3. Progress Calculation Engine
- Overall score calculation with weighted recent performance
- Subject-specific performance metrics
- Improvement rate calculation
- Study consistency metrics (0-100 scale)
- Performance trends over time

### 4. Heatmap Generation
- Error rate calculation by topic
- Trend analysis (improving/stable/declining)
- Weak topics identification (>50% error rate)
- Strong topics identification (<20% error rate)
- Subject-specific and comprehensive heatmaps

### 5. Predictive Analytics
- Success prediction using AI service or local algorithm
- Confidence scoring based on data availability
- Factor analysis (performance, consistency, improvement, mastery, effort)
- Personalized recommendations
- 7-day prediction validity with caching

### 6. API Endpoints

#### Progress Endpoints
- `GET /api/analytics/progress/:studentId` - Get student progress for date range
- `GET /api/analytics/trends/:studentId` - Get performance trends over time

#### Heatmap Endpoints
- `GET /api/analytics/heatmap/:studentId` - Get comprehensive heatmap
- `GET /api/analytics/weak-topics/:studentId` - Get weak topics
- `GET /api/analytics/strong-topics/:studentId` - Get strong topics
- `GET /api/analytics/improving-topics/:studentId` - Get improving topics
- `GET /api/analytics/declining-topics/:studentId` - Get declining topics

#### Prediction Endpoints
- `GET /api/analytics/prediction/:studentId` - Get success prediction

#### Event Tracking Endpoints
- `POST /api/analytics/track-event` - Track student activity event
- `GET /api/analytics/realtime/:studentId` - Get real-time metrics

#### Snapshot Endpoints
- `POST /api/analytics/generate-snapshot/:studentId` - Manually trigger snapshot generation

## Database Migrations

Run migrations:
```bash
npm run migrate
```

Migrations are automatically run on service startup.

## Scheduled Jobs

The service runs the following scheduled jobs:
- **Daily Snapshots**: Generated at midnight for all active students (last 30 days)

## WebSocket Real-Time Updates

Connect to WebSocket server and subscribe to student updates:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3004');

// Subscribe to student updates
socket.emit('subscribe:student', studentId);

// Listen for updates
socket.on('analytics:update', (update) => {
  console.log('Analytics update:', update);
});

// Unsubscribe
socket.emit('unsubscribe:student', studentId);
```

## Event Tracking

Track student activities:

```javascript
POST /api/analytics/track-event
{
  "studentId": "uuid",
  "activityType": "test_completed",
  "subject": "Mathematics",
  "topic": "Algebra",
  "metadata": {
    "correct": true,
    "questionId": "q123"
  },
  "durationMinutes": 5,
  "score": 85
}
```

Activity types:
- `test_completed`
- `lesson_viewed`
- `explanation_requested`
- `task_completed`
- `login`
- `study_session`

## Environment Variables

```env
ANALYTICS_SERVICE_PORT=3004
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_tutor
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

## Development

```bash
# Install dependencies
npm install

# Run migrations
npm run migrate

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Performance Considerations

- **Real-time updates**: Cached for 10 seconds (as per requirement 4.4)
- **Predictions**: Cached for 7 days with validity checking
- **Database indexes**: Optimized for time-series queries
- **Batch processing**: Snapshot generation in batches of 10 students
- **WebSocket**: Efficient pub/sub pattern using Redis

## Requirements Coverage

- ✅ **4.1**: Progress analytics with overall and subject-specific scores
- ✅ **4.2**: Heatmap generation with error rates and trends
- ✅ **4.3**: Predictive analytics with 85%+ accuracy target
- ✅ **4.4**: Real-time updates every 10 seconds during active sessions
