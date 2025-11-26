import { Server as SocketIOServer, Socket } from 'socket.io';
import { ChatSessionModel } from '../models/ChatSession';

export class ChatService {
  private io: SocketIOServer;
  private userSockets: Map<string, Socket> = new Map();
  private agentSockets: Map<string, Socket> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      socket.on('user:join', async (data: { userId: string }) => {
        this.userSockets.set(data.userId, socket);
        socket.join(`user:${data.userId}`);
        console.log(`User ${data.userId} joined chat`);
      });

      socket.on('agent:join', async (data: { agentId: string }) => {
        this.agentSockets.set(data.agentId, socket);
        socket.join(`agent:${data.agentId}`);
        console.log(`Agent ${data.agentId} joined chat`);

        // Notify agent of waiting sessions
        const waitingSessions = await ChatSessionModel.getWaitingSessions();
        socket.emit('sessions:waiting', waitingSessions);
      });

      socket.on('chat:start', async (data: { userId: string }) => {
        try {
          const session = await ChatSessionModel.create(data.userId);
          socket.emit('chat:session_created', session);

          // Notify available agents
          this.io.to('agents').emit('chat:new_session', session);

          // Send automated greeting
          const greeting = await ChatSessionModel.addMessage({
            sessionId: session.id,
            senderId: 'system',
            senderType: 'bot',
            message:
              'Hello! Thank you for contacting support. An agent will be with you shortly. How can we help you today?',
          });

          socket.emit('chat:message', greeting);
        } catch (error) {
          socket.emit('chat:error', { message: 'Failed to start chat session' });
        }
      });

      socket.on(
        'chat:message',
        async (data: { sessionId: string; userId: string; message: string }) => {
          try {
            const session = await ChatSessionModel.findById(data.sessionId);
            if (!session) {
              socket.emit('chat:error', { message: 'Session not found' });
              return;
            }

            const message = await ChatSessionModel.addMessage({
              sessionId: data.sessionId,
              senderId: data.userId,
              senderType: 'user',
              message: data.message,
            });

            // Send to user
            this.io.to(`user:${session.userId}`).emit('chat:message', message);

            // Send to agent if assigned
            if (session.agentId) {
              this.io.to(`agent:${session.agentId}`).emit('chat:message', message);
            }
          } catch (error) {
            socket.emit('chat:error', { message: 'Failed to send message' });
          }
        }
      );

      socket.on(
        'agent:message',
        async (data: { sessionId: string; agentId: string; message: string }) => {
          try {
            const session = await ChatSessionModel.findById(data.sessionId);
            if (!session) {
              socket.emit('chat:error', { message: 'Session not found' });
              return;
            }

            const message = await ChatSessionModel.addMessage({
              sessionId: data.sessionId,
              senderId: data.agentId,
              senderType: 'agent',
              message: data.message,
            });

            // Send to user
            this.io.to(`user:${session.userId}`).emit('chat:message', message);

            // Send to agent
            this.io.to(`agent:${data.agentId}`).emit('chat:message', message);
          } catch (error) {
            socket.emit('chat:error', { message: 'Failed to send message' });
          }
        }
      );

      socket.on('agent:accept_session', async (data: { sessionId: string; agentId: string }) => {
        try {
          const session = await ChatSessionModel.assignAgent(data.sessionId, data.agentId);
          if (!session) {
            socket.emit('chat:error', { message: 'Session not found' });
            return;
          }

          // Notify user
          this.io.to(`user:${session.userId}`).emit('chat:agent_joined', {
            sessionId: session.id,
            agentId: data.agentId,
          });

          // Notify agent
          socket.emit('chat:session_accepted', session);

          // Send automated message
          const message = await ChatSessionModel.addMessage({
            sessionId: session.id,
            senderId: 'system',
            senderType: 'bot',
            message: 'An agent has joined the chat and will assist you shortly.',
          });

          this.io.to(`user:${session.userId}`).emit('chat:message', message);
        } catch (error) {
          socket.emit('chat:error', { message: 'Failed to accept session' });
        }
      });

      socket.on(
        'chat:end',
        async (data: { sessionId: string; rating?: number; feedback?: string }) => {
          try {
            const session = await ChatSessionModel.endSession(
              data.sessionId,
              data.rating,
              data.feedback
            );
            if (!session) {
              socket.emit('chat:error', { message: 'Session not found' });
              return;
            }

            // Notify both parties
            this.io.to(`user:${session.userId}`).emit('chat:ended', session);
            if (session.agentId) {
              this.io.to(`agent:${session.agentId}`).emit('chat:ended', session);
            }
          } catch (error) {
            socket.emit('chat:error', { message: 'Failed to end session' });
          }
        }
      );

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Clean up socket references
        for (const [userId, userSocket] of this.userSockets.entries()) {
          if (userSocket.id === socket.id) {
            this.userSockets.delete(userId);
          }
        }
        for (const [agentId, agentSocket] of this.agentSockets.entries()) {
          if (agentSocket.id === socket.id) {
            this.agentSockets.delete(agentId);
          }
        }
      });
    });
  }
}
