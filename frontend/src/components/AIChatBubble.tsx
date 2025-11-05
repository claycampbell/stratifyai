import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api';
import { Send, Bot, User, X, MessageSquare, Minimize2, History } from 'lucide-react';
import ChatHistorySidebar from './ChatHistorySidebar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  created_at?: string;
}

export default function AIChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: chatHistory } = useQuery({
    queryKey: ['chat', sessionId],
    queryFn: () => aiApi.getChatHistory(sessionId).then((res) => res.data),
    initialData: [],
    enabled: isOpen,
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => aiApi.chat(msg, sessionId),
    onSuccess: (response) => {
      try {
        queryClient.invalidateQueries({ queryKey: ['chat', sessionId] });

        // If actions were executed by the backend, refresh relevant data
        if (response?.data?.actions && Array.isArray(response.data.actions) && response.data.actions.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['kpis'] });
          queryClient.invalidateQueries({ queryKey: ['ogsm'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }

        setMessage('');
      } catch (error) {
        console.error('Error in chat mutation onSuccess:', error);
      }
    },
    onError: (error) => {
      console.error('Chat mutation error:', error);
    },
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !chatMutation.isPending) {
      // Send message to AI - the backend will handle action detection and execution
      chatMutation.mutate(message);
    }
  };

  const handleSelectSession = (newSessionId: string) => {
    setSessionId(newSessionId);
    setShowHistory(false);
  };

  const handleNewChat = () => {
    setSessionId(crypto.randomUUID());
    setShowHistory(false);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  return (
    <>
      {/* Chat Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 flex items-center space-x-2"
          aria-label="Open AI Chat"
        >
          <Bot className="h-6 w-6" />
          <span className="text-sm font-medium pr-1">AI Strategy Officer</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">AI Chief Strategy Officer</h3>
                <p className="text-xs text-primary-100">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="hover:bg-primary-700 p-1 rounded transition-colors"
                aria-label="Chat history"
                title="Chat history"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="hover:bg-primary-700 p-1 rounded transition-colors"
                aria-label="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-primary-700 p-1 rounded transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {chatHistory && chatHistory.length === 0 && (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-primary-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium mb-2">
                  Hi! I'm your AI Chief Strategy Officer
                </p>
                <p className="text-sm text-gray-600 px-4">
                  I can answer questions, provide insights, and help you with tasks like:
                </p>
                <ul className="text-xs text-gray-500 mt-3 space-y-1 text-left px-8">
                  <li>• Add or update KPIs</li>
                  <li>• Create OGSM components</li>
                  <li>• Analyze strategic alignment</li>
                  <li>• Generate reports</li>
                  <li>• Answer strategy questions</li>
                </ul>
              </div>
            )}

            {Array.isArray(chatHistory) && chatHistory.map((msg: Message) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-2 ${
                  msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    msg.role === 'user'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-white text-primary-600 border border-primary-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`flex-1 p-3 rounded-lg max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white text-primary-600 border border-primary-200 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1 p-3 rounded-lg bg-white border border-gray-200 max-w-[85%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
            <form onSubmit={handleSend} className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything or tell me what to do..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                disabled={chatMutation.isPending}
              />
              <button
                type="submit"
                disabled={!message.trim() || chatMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-6 right-6 z-50 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-3 shadow-lg transition-all flex items-center space-x-2"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-sm font-medium">AI Chat</span>
          {chatHistory && chatHistory.length > 0 && (
            <span className="bg-white text-primary-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {chatHistory.length}
            </span>
          )}
        </button>
      )}

      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}
