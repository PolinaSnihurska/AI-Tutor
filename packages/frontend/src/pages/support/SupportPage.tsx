import React, { useState } from 'react';
import { SupportChat } from '../../components/support/SupportChat';
import { SupportTicketForm, TicketList } from '../../components/support/SupportTicket';
import { KnowledgeBaseSearch, PopularArticles } from '../../components/support/KnowledgeBase';
import { useAuth } from '../../hooks/useAuth';

type SupportTab = 'chat' | 'tickets' | 'knowledge-base';

export const SupportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SupportTab>('knowledge-base');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const { user } = useAuth();

  const tabs = [
    { id: 'knowledge-base' as SupportTab, label: 'Knowledge Base', icon: '📚' },
    { id: 'chat' as SupportTab, label: 'Live Chat', icon: '💬' },
    { id: 'tickets' as SupportTab, label: 'Support Tickets', icon: '🎫' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
          <p className="text-gray-600">
            Get help with your questions or issues. We're here to assist you!
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-center font-medium transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'knowledge-base' && (
            <div className="space-y-8">
              <KnowledgeBaseSearch />
              <div className="border-t pt-8">
                <PopularArticles />
              </div>
            </div>
          )}

          {activeTab === 'chat' && user && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Live Chat Support</h2>
                <p className="text-gray-600">
                  Chat with our support team in real-time. Average response time: 2 minutes.
                </p>
              </div>
              <SupportChat userId={user.id} />
            </div>
          )}

          {activeTab === 'tickets' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Support Tickets</h2>
                  <p className="text-gray-600">
                    Create and track support tickets for non-urgent issues.
                  </p>
                </div>
                {!showTicketForm && (
                  <button
                    onClick={() => setShowTicketForm(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Create Ticket
                  </button>
                )}
              </div>

              {showTicketForm ? (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">New Support Ticket</h3>
                    <button
                      onClick={() => setShowTicketForm(false)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                  <SupportTicketForm
                    onSuccess={() => {
                      setShowTicketForm(false);
                      alert('Ticket submitted successfully!');
                    }}
                  />
                </div>
              ) : (
                <TicketList />
              )}
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4">Other Ways to Reach Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2">📧 Email Support</h4>
              <p className="text-sm text-gray-600 mb-1">support@aitutoring.com</p>
              <p className="text-xs text-gray-500">Response within 24 hours</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">📞 Phone Support</h4>
              <p className="text-sm text-gray-600 mb-1">Premium users only</p>
              <p className="text-xs text-gray-500">9 AM - 6 PM weekdays</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">🌐 Community Forum</h4>
              <p className="text-sm text-gray-600 mb-1">community.aitutoring.com</p>
              <p className="text-xs text-gray-500">Get help from other users</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
