import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  senderId: string;
  senderType: 'user' | 'agent' | 'bot';
  message: string;
  createdAt: Date;
}

interface ChatSession {
  id: string;
  status: 'waiting' | 'active' | 'ended';
}

export const SupportChat: React.FC<{ userId: string }> = ({ userId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SUPPORT_SERVICE_URL || 'http://localhost:3007');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('user:join', { userId });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('chat:session_created', (newSession: ChatSession) => {
      setSession(newSession);
    });

    newSocket.on('chat:message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('chat:agent_joined', () => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          senderId: 'system',
          senderType: 'bot',
          message: 'An agent has joined the chat.',
          createdAt: new Date(),
        },
      ]);
    });

    newSocket.on('chat:ended', () => {
      setSession(null);
    });

    return () => {
      newSocket.close();
    };
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startChat = () => {
    if (socket) {
      socket.emit('chat:start', { userId });
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !session || !socket) return;

    socket.emit('chat:message', {
      sessionId: session.id,
      userId,
      message: inputMessage,
    });

    setInputMessage('');
  };

  const endChat = () => {
    if (socket && session) {
      socket.emit('chat:end', { sessionId: session.id });
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to support...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            Start a chat with our support team. We're here to help!
          </p>
          <button
            onClick={startChat}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Start Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Support Chat</h3>
          <p className="text-sm text-blue-100">
            {session.status === 'waiting' ? 'Waiting for agent...' : 'Connected'}
          </p>
        </div>
        <button
          onClick={endChat}
          className="text-white hover:text-blue-100 transition"
          title="End chat"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.senderType === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.senderType === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.senderType === 'bot'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-green-100 text-gray-800'
              }`}
            >
              {msg.senderType === 'agent' && (
                <p className="text-xs font-semibold mb-1 text-green-700">Support Agent</p>
              )}
              {msg.senderType === 'bot' && (
                <p className="text-xs font-semibold mb-1 text-gray-600">System</p>
              )}
              <p className="text-sm">{msg.message}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.senderType === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
