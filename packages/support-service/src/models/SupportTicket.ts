import pool from '../db/connection';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'content' | 'account' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'support' | 'system';
  message: string;
  attachments?: any;
  createdAt: Date;
}

export class SupportTicketModel {
  static async create(data: {
    userId: string;
    subject: string;
    description: string;
    category: string;
    priority?: string;
  }): Promise<SupportTicket> {
    const query = `
      INSERT INTO support_tickets (user_id, subject, description, category, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      data.userId,
      data.subject,
      data.description,
      data.category,
      data.priority || 'medium',
    ];
    const result = await pool.query(query, values);
    return this.mapToTicket(result.rows[0]);
  }

  static async findById(id: string): Promise<SupportTicket | null> {
    const query = 'SELECT * FROM support_tickets WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? this.mapToTicket(result.rows[0]) : null;
  }

  static async findByUserId(userId: string): Promise<SupportTicket[]> {
    const query = `
      SELECT * FROM support_tickets 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map(this.mapToTicket);
  }

  static async updateStatus(
    id: string,
    status: string,
    assignedTo?: string
  ): Promise<SupportTicket | null> {
    const query = `
      UPDATE support_tickets 
      SET status = $1, assigned_to = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [status, assignedTo, id]);
    return result.rows[0] ? this.mapToTicket(result.rows[0]) : null;
  }

  static async addMessage(data: {
    ticketId: string;
    senderId: string;
    senderType: 'user' | 'support' | 'system';
    message: string;
    attachments?: any;
  }): Promise<TicketMessage> {
    const query = `
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_type, message, attachments)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      data.ticketId,
      data.senderId,
      data.senderType,
      data.message,
      data.attachments ? JSON.stringify(data.attachments) : null,
    ];
    const result = await pool.query(query, values);
    return this.mapToMessage(result.rows[0]);
  }

  static async getMessages(ticketId: string): Promise<TicketMessage[]> {
    const query = `
      SELECT * FROM ticket_messages 
      WHERE ticket_id = $1 
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query, [ticketId]);
    return result.rows.map(this.mapToMessage);
  }

  static async getOpenTickets(): Promise<SupportTicket[]> {
    const query = `
      SELECT * FROM support_tickets 
      WHERE status IN ('open', 'in_progress', 'waiting_user')
      ORDER BY priority DESC, created_at ASC
    `;
    const result = await pool.query(query);
    return result.rows.map(this.mapToTicket);
  }

  private static mapToTicket(row: any): SupportTicket {
    return {
      id: row.id,
      userId: row.user_id,
      subject: row.subject,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      assignedTo: row.assigned_to,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
    };
  }

  private static mapToMessage(row: any): TicketMessage {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      senderId: row.sender_id,
      senderType: row.sender_type,
      message: row.message,
      attachments: row.attachments,
      createdAt: row.created_at,
    };
  }
}
