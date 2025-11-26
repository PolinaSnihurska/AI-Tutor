# AI Tutoring Platform - Frontend

React-based frontend application for the AI Tutoring Platform.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Redux Toolkit** for global state management
- **TanStack Query** (React Query) for server state management
- **React Router** for routing
- **Axios** for API communication

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Loading.tsx
│   │   ├── ErrorMessage.tsx
│   │   └── Toast.tsx
│   └── layout/          # Layout components
│       ├── Container.tsx
│       └── Layout.tsx
├── store/               # Redux store
│   ├── index.ts
│   └── slices/
│       ├── authSlice.ts
│       └── userSlice.ts
├── lib/
│   ├── api/             # API client layer
│   │   ├── client.ts    # Axios instance with interceptors
│   │   ├── authApi.ts
│   │   ├── userApi.ts
│   │   ├── aiApi.ts
│   │   ├── testApi.ts
│   │   ├── analyticsApi.ts
│   │   └── learningPlanApi.ts
│   └── queryClient.ts   # React Query configuration
├── hooks/               # Custom React hooks
│   └── useAuth.ts
├── router/              # React Router configuration
│   └── index.tsx
└── main.tsx             # Application entry point
```

## Features Implemented

### State Management
- Redux Toolkit for authentication and user profile state
- TanStack Query for server state caching and synchronization
- Toast notification system with context provider

### UI Components
- Button with variants (primary, secondary, outline, danger) and loading states
- Input with label, error, and helper text support
- Card components with header, title, and content sections
- Modal with keyboard navigation (ESC to close)
- Loading spinner with full-screen option
- Error message components with retry functionality
- Toast notifications with auto-dismiss

### API Client Layer
- Axios instance with request/response interceptors
- Automatic JWT token injection
- Token refresh mechanism with request queuing
- Error handling utilities
- Type-safe API clients for all backend services:
  - Auth Service (login, register, logout, password reset)
  - User Service (profile, subscription, children)
  - AI Service (explanations, test generation, learning plans)
  - Test Service (tests, submissions, results)
  - Analytics Service (progress, heatmap, predictions)
  - Learning Plan Service (plans, tasks, goals)

### Layout Components
- Responsive container with size variants
- Layout component with header, sidebar, and footer support

## Development

### Prerequisites
- Node.js 20+
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```
VITE_API_BASE_URL=http://localhost:3000
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Configuration

### ESLint
Frontend-specific ESLint configuration extends the root config with React-specific rules.

### Tailwind CSS
Configured with default theme. Custom utilities can be added in `tailwind.config.js`.

### TypeScript
Strict mode enabled with comprehensive type checking.

## API Integration

All API calls go through the centralized `apiClient` which handles:
- Authentication token injection
- Automatic token refresh on 401 errors
- Request queuing during token refresh
- Error handling and transformation

Example usage:
```typescript
import { authApi } from './lib/api';

// Login
const response = await authApi.login({ email, password });

// The token is automatically stored and used for subsequent requests
```

## State Management

### Redux Store
- `auth` slice: Authentication state (tokens, isAuthenticated)
- `user` slice: User profile data

### React Query
Used for server state management with automatic caching, refetching, and synchronization.

Example usage:
```typescript
import { useProfile } from './hooks/useAuth';

function ProfileComponent() {
  const { data: profile, isLoading, error } = useProfile();
  // ...
}
```

## Next Steps

The foundation is now ready for building:
- Authentication pages (login, register, password reset)
- Student dashboard
- Parent cabinet
- Learning interface
- Test-taking interface
- Analytics visualizations
