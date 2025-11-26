# Customer Support System Documentation

## Overview

The AI Tutoring Platform includes a comprehensive customer support system with three main components:

1. **Live Chat Support** - Real-time chat with support agents
2. **Support Tickets** - Asynchronous ticket-based support
3. **Knowledge Base** - Self-service help articles

## Architecture

### Components

- **Support Service** (Node.js/Express + Socket.IO)
  - Handles ticket management
  - Manages live chat sessions
  - Serves knowledge base articles
  
- **Frontend Components** (React)
  - Chat interface
  - Ticket creation and management
  - Knowledge base search

### Database Schema

The support system uses PostgreSQL with the following tables:

- `support_tickets` - Support ticket records
- `ticket_messages` - Messages within tickets
- `chat_sessions` - Live chat session records
- `chat_messages` - Messages within chat sessions
- `kb_articles` - Knowledge base articles
- `kb_article_feedback` - User feedback on articles
- `support_agents` - Support agent profiles

## Features

### 1. Live Chat Support

**User Experience:**
- Click "Start Chat" to initiate a session
- Automated greeting message
- Wait for agent assignment
- Real-time messaging with agent
- End chat and provide rating/feedback

**Agent Experience:**
- See waiting chat sessions
- Accept sessions (up to max concurrent limit)
- Real-time messaging with users
- End sessions when resolved

**Technical Details:**
- WebSocket-based (Socket.IO)
- Real-time bidirectional communication
- Automatic reconnection handling
- Message persistence in database

### 2. Support Tickets

**Features:**
- Create tickets with subject, description, category, and priority
- View all user's tickets
- Add messages to existing tickets
- Track ticket status (open, in_progress, waiting_user, resolved, closed)
- Email notifications for ticket updates

**Categories:**
- Technical issues
- Billing & subscription
- Content quality
- Account management
- Other

**Priority Levels:**
- Low - General questions
- Medium - Issues affecting usage
- High - Significant problems
- Urgent - Critical issues

### 3. Knowledge Base

**Features:**
- Search articles by keyword
- Browse by category
- View popular articles
- Rate articles (helpful/not helpful)
- Track article views
- Admin article management

**Article Structure:**
- Title and slug
- Content (HTML supported)
- Category and tags
- Author information
- Publication status
- View and feedback counts

## API Endpoints

### Tickets

```
POST   /api/tickets              - Create new ticket
GET    /api/tickets/my-tickets   - Get user's tickets
GET    /api/tickets/:id          - Get ticket details
POST   /api/tickets/:id/messages - Add message to ticket
PATCH  /api/tickets/:id/status   - Update ticket status (admin)
GET    /api/tickets/admin/open   - Get all open tickets (admin)
```

### Knowledge Base

```
GET    /api/kb/search            - Search articles
GET    /api/kb/popular           - Get popular articles
GET    /api/kb/category/:cat     - Get articles by category
GET    /api/kb/:slug             - Get article by slug
POST   /api/kb/:id/feedback      - Submit article feedback
POST   /api/kb                   - Create article (admin)
PATCH  /api/kb/:id               - Update article (admin)
POST   /api/kb/:id/publish       - Publish article (admin)
```

### Live Chat (WebSocket Events)

**Client Events:**
```
user:join              - User joins chat system
chat:start             - Start new chat session
chat:message           - Send message
chat:end               - End chat session
```

**Server Events:**
```
chat:session_created   - Session created
chat:message           - New message received
chat:agent_joined      - Agent joined session
chat:ended             - Session ended
chat:error             - Error occurred
```

## Setup Instructions

### 1. Database Setup

Run the migration:

```bash
psql -U postgres -d ai_tutoring -f packages/support-service/src/db/migrations/001_create_support_tables.sql
```

### 2. Environment Variables

Add to `.env`:

```
# Support Service
SUPPORT_SERVICE_PORT=3007
SUPPORT_SERVICE_URL=http://localhost:3007

# Frontend
REACT_APP_SUPPORT_SERVICE_URL=http://localhost:3007
```

### 3. Install Dependencies

```bash
cd packages/support-service
npm install
```

### 4. Start Service

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

### 5. Seed Knowledge Base (Optional)

Create initial help articles through the admin panel or API.

## Usage Examples

### Creating a Support Ticket

```typescript
const ticket = await axios.post('/api/tickets', {
  subject: 'Cannot access premium features',
  description: 'I upgraded to premium but still see free tier limits',
  category: 'billing',
  priority: 'high'
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Starting a Live Chat

```typescript
const socket = io('http://localhost:3007');

socket.emit('user:join', { userId: 'user-123' });
socket.emit('chat:start', { userId: 'user-123' });

socket.on('chat:session_created', (session) => {
  console.log('Chat session created:', session.id);
});

socket.on('chat:message', (message) => {
  console.log('New message:', message.message);
});
```

### Searching Knowledge Base

```typescript
const results = await axios.get('/api/kb/search', {
  params: { q: 'how to upgrade subscription' }
});
```

## Admin Features

### Managing Tickets

Admins can:
- View all open tickets
- Assign tickets to agents
- Update ticket status
- Reply to tickets
- Close resolved tickets

### Managing Knowledge Base

Admins can:
- Create new articles
- Edit existing articles
- Publish/unpublish articles
- View article analytics
- Manage categories and tags

### Managing Chat

Agents can:
- Set online/offline status
- Accept waiting chat sessions
- Handle multiple concurrent chats
- View chat history
- End chat sessions

## Best Practices

### For Users

1. **Search Knowledge Base First** - Many questions are already answered
2. **Provide Details** - Include screenshots, error messages, and steps to reproduce
3. **Choose Correct Category** - Helps route to the right team
4. **Set Appropriate Priority** - Reserve urgent for critical issues
5. **Be Patient** - Response times vary by priority and support hours

### For Support Agents

1. **Respond Promptly** - Acknowledge tickets within 2 hours
2. **Be Professional** - Maintain friendly, helpful tone
3. **Provide Solutions** - Don't just acknowledge, solve the problem
4. **Follow Up** - Ensure issue is fully resolved before closing
5. **Update Knowledge Base** - Add articles for common questions

### For Administrators

1. **Monitor Metrics** - Track response times, resolution rates, satisfaction
2. **Update Articles** - Keep knowledge base current
3. **Train Agents** - Ensure consistent, quality support
4. **Analyze Trends** - Identify common issues and address root causes
5. **Gather Feedback** - Use ratings and comments to improve

## Monitoring

### Key Metrics

- **Response Time** - Time to first response
- **Resolution Time** - Time to close ticket
- **Customer Satisfaction** - Chat ratings and article feedback
- **Ticket Volume** - Number of tickets by category/priority
- **Chat Wait Time** - Time users wait for agent
- **Knowledge Base Usage** - Article views and search queries

### Alerts

Set up alerts for:
- High ticket volume
- Long wait times
- Low satisfaction scores
- System errors
- Agent availability issues

## Troubleshooting

### Chat Not Connecting

1. Check WebSocket connection
2. Verify CORS settings
3. Check firewall rules
4. Ensure Socket.IO versions match

### Tickets Not Sending

1. Verify authentication token
2. Check database connection
3. Review server logs
4. Validate request payload

### Knowledge Base Search Not Working

1. Check database indexes
2. Verify search query format
3. Review article publication status
4. Check for special characters

## Future Enhancements

Planned features:
- AI-powered chatbot for common questions
- Video chat support
- Screen sharing for technical issues
- Multi-language support
- Integration with CRM systems
- Advanced analytics dashboard
- Mobile app support
- Community forum integration

## Support

For questions about the support system:
- Email: dev@aitutoring.com
- Slack: #support-system
- Documentation: docs.aitutoring.com/support

---

**Last Updated**: November 2025
**Version**: 1.0.0
