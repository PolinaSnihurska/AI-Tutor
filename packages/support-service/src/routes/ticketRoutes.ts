import { Router, Request, Response } from 'express';
import { SupportTicketModel } from '../models/SupportTicket';

const router = Router();

// Create a new support ticket
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subject, description, category, priority } = req.body;
    const userId = (req as any).user.id;

    if (!subject || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ticket = await SupportTicketModel.create({
      userId,
      subject,
      description,
      category,
      priority,
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Get user's tickets
router.get('/my-tickets', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tickets = await SupportTicketModel.findByUserId(userId);
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get specific ticket
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const ticket = await SupportTicketModel.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check if user owns the ticket
    if (ticket.userId !== userId && (req as any).user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await SupportTicketModel.getMessages(id);
    res.json({ ticket, messages });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Add message to ticket
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = (req as any).user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ticket = await SupportTicketModel.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check if user owns the ticket
    if (ticket.userId !== userId && (req as any).user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const ticketMessage = await SupportTicketModel.addMessage({
      ticketId: id,
      senderId: userId,
      senderType: (req as any).user.role === 'admin' ? 'support' : 'user',
      message,
    });

    // Update ticket status if user replied
    if (ticket.status === 'waiting_user') {
      await SupportTicketModel.updateStatus(id, 'in_progress');
    }

    res.status(201).json(ticketMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Update ticket status (admin only)
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { status, assignedTo } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const ticket = await SupportTicketModel.updateStatus(id, status, assignedTo);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Get all open tickets (admin only)
router.get('/admin/open', async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tickets = await SupportTicketModel.getOpenTickets();
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching open tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

export default router;
