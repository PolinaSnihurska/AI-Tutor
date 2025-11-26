import React, { useState } from 'react';
import axios from 'axios';

interface TicketFormData {
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'content' | 'account' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export const SupportTicketForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<TicketFormData>({
    subject: '',
    description: '',
    category: 'technical',
    priority: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await axios.post(
        `${process.env.REACT_APP_SUPPORT_SERVICE_URL}/api/tickets`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      // Reset form
      setFormData({
        subject: '',
        description: '',
        category: 'technical',
        priority: 'medium',
      });

      onSuccess?.();
    } catch (err) {
      setError('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject
        </label>
        <input
          type="text"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          required
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="Brief description of your issue"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          value={formData.category}
          onChange={(e) =>
            setFormData({
              ...formData,
              category: e.target.value as TicketFormData['category'],
            })
          }
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="technical">Technical Issue</option>
          <option value="billing">Billing & Subscription</option>
          <option value="content">Content Quality</option>
          <option value="account">Account Management</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </label>
        <select
          value={formData.priority}
          onChange={(e) =>
            setFormData({
              ...formData,
              priority: e.target.value as TicketFormData['priority'],
            })
          }
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="low">Low - General question</option>
          <option value="medium">Medium - Issue affecting usage</option>
          <option value="high">High - Significant problem</option>
          <option value="urgent">Urgent - Critical issue</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          rows={6}
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="Please provide as much detail as possible about your issue..."
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
      </button>
    </form>
  );
};

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

export const TicketList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SUPPORT_SERVICE_URL}/api/tickets/my-tickets`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'waiting_user':
        return 'bg-purple-100 text-purple-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No support tickets yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{ticket.subject}</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                ticket.status
              )}`}
            >
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="capitalize">{ticket.category}</span>
            <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority} priority
            </span>
            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
