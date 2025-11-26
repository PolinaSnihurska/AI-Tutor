# Admin Service

Backend service for the AI Tutoring Platform admin panel.

## Features

### Authentication & Security
- Enhanced admin login with account lockout after 5 failed attempts
- JWT-based authentication with 8-hour token expiration
- Rate limiting on login endpoint (5 attempts per 15 minutes)
- Role-based access control (admin/super_admin)

### Dashboard Metrics
- Total and active user counts
- Subscription statistics and revenue tracking
- AI query and test generation analytics
- Real-time metrics updates

### User Management
- View all users with pagination and filtering
- Detailed user information including usage stats
- Update user verification status
- Delete user accounts (with safeguards)

## API Endpoints

### Authentication
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/profile` - Get admin profile (protected)

### Dashboard
- `GET /api/admin/dashboard/metrics` - Get dashboard metrics (protected)

### User Management
- `GET /api/admin/users` - Get all users with pagination (protected)
- `GET /api/admin/users/:userId` - Get user details (protected)
- `PATCH /api/admin/users/:userId/status` - Update user status (protected)
- `DELETE /api/admin/users/:userId` - Delete user (protected)

## Environment Variables

```env
PORT=3007
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_tutor
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key
ADMIN_FRONTEND_URL=http://localhost:5174
```

## Running the Service

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Production
npm start
```

## Security Features

1. **Account Lockout**: Accounts are locked for 15 minutes after 5 failed login attempts
2. **Rate Limiting**: Login endpoint limited to 5 attempts per 15 minutes per IP
3. **JWT Expiration**: Admin tokens expire after 8 hours (shorter than user tokens)
4. **Helmet.js**: Security headers enabled
5. **CORS**: Restricted to admin frontend URL only

## Requirements

- Node.js 20+
- PostgreSQL database (shared with auth-service)
- Redis (for rate limiting)
