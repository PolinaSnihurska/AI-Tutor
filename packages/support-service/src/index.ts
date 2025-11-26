import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import ticketRoutes from './routes/ticketRoutes';
import knowledgeBaseRoutes from './routes/knowledgeBaseRoutes';
import { ChatService } from './services/chatService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Simple auth middleware (replace with actual JWT verification)
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // TODO: Verify JWT token and attach user to request
  req.user = { id: 'user-id', role: 'user' }; // Placeholder
  next();
};

// Routes
app.use('/api/tickets', authMiddleware, ticketRoutes);
app.use('/api/kb', knowledgeBaseRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'support-service' });
});

// Initialize chat service
new ChatService(io);

const PORT = process.env.PORT || 3007;

httpServer.listen(PORT, () => {
  console.log(`Support service running on port ${PORT}`);
});

export default app;
