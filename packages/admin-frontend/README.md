# Admin Frontend

React-based admin panel for the AI Tutoring Platform.

## Features

### Dashboard
- Real-time platform metrics
- User statistics (total, active)
- Revenue and subscription tracking
- AI usage analytics
- Quick action links

### User Management
- View all users with pagination
- Search and filter by role
- View detailed user information
- Update user verification status
- Delete user accounts

### Security
- Secure admin authentication
- Protected routes
- Automatic token refresh
- Session management

## Tech Stack

- React 18 with TypeScript
- React Router for navigation
- TanStack Query for data fetching
- Tailwind CSS for styling
- Lucide React for icons
- Axios for API calls

## Running the Application

```bash
# Install dependencies
npm install

# Development mode (runs on port 5174)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment

The frontend proxies API requests to the admin service:
- Frontend: `http://localhost:5174`
- Backend API: `http://localhost:3007`

## Pages

1. **Login** (`/login`) - Admin authentication
2. **Dashboard** (`/dashboard`) - Platform metrics overview
3. **Users** (`/users`) - User management interface
4. **Content** (`/content`) - Content management (placeholder)
5. **Monitoring** (`/monitoring`) - System monitoring (placeholder)

## Authentication Flow

1. Admin enters credentials on login page
2. Backend validates and returns JWT token
3. Token stored in localStorage
4. Token included in all API requests via interceptor
5. Automatic redirect to login on 401 errors

## Default Admin Account

To create an admin account, insert directly into the database:

```sql
INSERT INTO users (email, password_hash, role, first_name, last_name, email_verified)
VALUES (
  'admin@example.com',
  '$2b$10$...', -- bcrypt hash of password
  'admin',
  'Admin',
  'User',
  true
);
```
