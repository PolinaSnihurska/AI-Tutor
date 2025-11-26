import pool from '../db/connection';

export interface ChatSession {
  id: string;
  userId: string;
  agentId?: string;
  status: 'waiting' | 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
  rating?: number;
  feedback?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderType: 'user' | 'agent' | 'bot';
  message: string;
  createdAt: Date;
}

export class ChatSessionModel {
  static async create(userId: string): Promise<ChatSession> {
    const query = `
      INSERT INTO chat_sessions (user_id, status)
      VALUES ($1, 'waiting')
      RETURNING *
    `;
    const result = await pool.query(query, [userId]);
    return this.mapToSession(result.rows[0]);
  }

  static async findById(id: string): Promise<ChatSession | null> {
    const query = 'SELECT * FROM chat_sessions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? this.mapToSession(result.rows[0]) : null;
  }

  static async assignAgent(sessionId: string, agentId: string): Promise<ChatSession | null> {
    const query = `
      UPDATE chat_sessions 
      SET agent_id = $1, status = 'active'
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [agentId, sessionId]);
    return result.rows[0] ? this.mapToSession(result.rows[0]) : null;
  }

  static async endSession(
    sessionId: string,
    rating?: number,
    feedback?: string
  ): Promise<ChatSession | null> {
    const query = `
      UPDATE chat_sessions 
      SET status = 'ended', ended_at = CURRENT_TIMESTAMP, rating = $1, feedback = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [rating, feedback, sessionId]);
    return result.rows[0] ? this.mapToSession(result.rows[0]) : null;
  }

  static async addMessage(data: {
    sessionId: string;
    senderId: string;
    senderType: 'user' | 'agent' | 'bot';
    message: string;
  }): Promise<ChatMessage> {
    const query = `
      INSERT INTO chat_messages (session_id, sender_id, sender_type, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [data.sessionId, data.senderId, data.senderType, data.message];
    const result = await pool.query(query, values);
    return this.mapToMessage(result.rows[0]);
  }

  static async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const query = `
      SELECT * FROM chat_messages 
      WHERE session_id = $1 
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query, [sessionId]);
    return result.rows.map(this.mapToMessage);
  }

  static async getWaitingSessions(): Promise<ChatSession[]> {
    const query = `
      SELECT * FROM chat_sessions 
      WHERE status = 'waiting'
      ORDER BY started_at ASC
    `;
    const result = await pool.query(query);
    return result.rows.map(this.mapToSession);
  }

  static async getActiveSessionsByAgent(agentId: string): Promise<ChatSession[]> {
    const query = `
      SELECT * FROM chat_sessions 
      WHERE agent_id = $1 AND status = 'active'
      ORDER BY started_at ASC
    `;
    const result = await pool.query(query, [agentId]);
    return result.rows.map(this.mapToSession);
  }

  private static mapToSession(row: any): ChatSession {
    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      rating: row.rating,
      feedback: row.feedback,
    };
  }

  private static mapToMessage(row: any): ChatMessage {
    return {
      id: row.id,
      sessionId: row.session_id,
      senderId: row.sender_id,
      senderType: row.sender_type,
      message: row.message,
      createdAt: row.created_at,
    };
  }
}
