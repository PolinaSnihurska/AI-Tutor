import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { EventTrackingService } from '../services/eventTrackingService';
import Redis from 'redis';

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export class AnalyticsWebSocket {
  private io: SocketIOServer;
  private subscriber: any;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.setupSocketHandlers();
    this.setupRedisSubscriber();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle student subscription
      socket.on('subscribe:student', async (studentId: string) => {
        console.log(`Client ${socket.id} subscribing to student ${studentId}`);
        socket.join(`student:${studentId}`);

        // Send initial real-time metrics
        const metrics = await EventTrackingService.getRealtimeMetrics(studentId);
        socket.emit('analytics:update', metrics);
      });

      // Handle unsubscribe
      socket.on('unsubscribe:student', (studentId: string) => {
        console.log(`Client ${socket.id} unsubscribing from student ${studentId}`);
        socket.leave(`student:${studentId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private async setupRedisSubscriber() {
    try {
      await redisClient.connect();
      
      this.subscriber = redisClient.duplicate();
      await this.subscriber.connect();

      // Subscribe to all student analytics updates
      await this.subscriber.pSubscribe('analytics:student:*', (message: string, channel: string) => {
        try {
          const studentId = channel.split(':')[2];
          const update = JSON.parse(message);

          // Broadcast to all clients subscribed to this student
          this.io.to(`student:${studentId}`).emit('analytics:update', update);
        } catch (error) {
          console.error('Error processing Redis message:', error);
        }
      });

      console.log('WebSocket Redis subscriber initialized');
    } catch (error) {
      console.error('Error setting up Redis subscriber:', error);
    }
  }

  async close() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    await redisClient.quit();
    this.io.close();
  }
}
