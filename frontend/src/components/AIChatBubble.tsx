import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api';
import { Send, Bot, User, X, MessageSquare, Minimize2, History, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, Plus, Search, Calendar, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import PhilosophyAlignmentCard from './PhilosophyAlignmentCard';
import ValidationStatusBadge from './ValidationStatusBadge';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  created_at?: string;
  alignment?: {
    core_values: string[];
    cited_principles: string[];
    decision_hierarchy: {
      university: number;
      department: number;
      individual: number;
    };
  };
  validation_status?: 'approved' | 'flagged' | 'rejected';
  violated_constraints?: string[];
  conflict_resolution?: string;
}

interface ChatSession {
  session_id: string;
  title?: string;
  created_at: string;
  last_message_at: string;
  message_count: number;
  first_user_message: string;
}

export default function AIChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: chatHistory } = useQuery({
    queryKey: ['chat', sessionId],
    queryFn: () => aiApi.getChatHistory(sessionId).then((res) => res.data),
    initialData: [],
    enabled: isOpen,
  });

  const { data: sessions } = useQuery<ChatSession[]>({
    queryKey: ['chat-sessions'],
    queryFn: () => aiApi.getChatSessions().then((res) => res.data),
    enabled: isOpen && showHistory,
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => aiApi.chat(msg, sessionId),
    onSuccess: (response) => {
      try {
        queryClient.invalidateQueries({ queryKey: ['chat', sessionId] });
        queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });

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

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => aiApi.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      setShowDeleteConfirm(null);
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

  const exportConversation = async (sessionId: string) => {
    try {
      const response = await aiApi.getChatHistory(sessionId);
      const messages = response.data;

      const exportText = messages
        .map((msg: any) => `[${format(new Date(msg.created_at), 'PPpp')}] ${msg.role.toUpperCase()}: ${msg.message}`)
        .join('\n\n');

      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export conversation:', error);
    }
  };

  const getSessionTitle = (session: ChatSession) => {
    if (session.title) {
      return session.title;
    }
    if (session.first_user_message) {
      return session.first_user_message.length > 35
        ? session.first_user_message.substring(0, 35) + '...'
        : session.first_user_message;
    }
    return 'New conversation';
  };

  const filteredSessions = sessions?.filter((session) =>
    session.first_user_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className={`fixed bottom-6 right-6 z-50 h-[600px] bg-white rounded-lg shadow-2xl flex border border-gray-200 transition-all duration-300 ${
          showHistory ? 'w-[700px]' : 'w-96'
        }`}>
          {/* History Panel - Slides in from left */}
          {showHistory && (
            <div className="w-64 border-r border-gray-200 flex flex-col">
              {/* History Header */}
              <div className="bg-primary-600 text-white p-3 rounded-tl-lg">
                <h4 className="font-semibold text-sm mb-2">Chat History</h4>
                <button
                  onClick={handleNewChat}
                  className="w-full bg-white text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Chat
                </button>
              </div>

              {/* Search */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto">
                {filteredSessions && filteredSessions.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {filteredSessions.map((session) => (
                      <div
                        key={session.session_id}
                        className={`p-2 hover:bg-gray-50 cursor-pointer transition-colors relative group ${
                          sessionId === session.session_id ? 'bg-primary-50 border-l-2 border-primary-600' : ''
                        }`}
                        onClick={() => handleSelectSession(session.session_id)}
                      >
                        {/* Delete Confirmation Overlay */}
                        {showDeleteConfirm === session.session_id && (
                          <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-10 p-2">
                            <p className="text-xs text-gray-900 font-medium mb-2 text-center">
                              Delete?
                            </p>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSessionMutation.mutate(session.session_id);
                                }}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(null);
                                }}
                                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <MessageSquare className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <h5 className="text-xs font-medium text-gray-900 truncate">
                                {getSessionTitle(session)}
                              </h5>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                              <Calendar className="h-2.5 w-2.5" />
                              <span>{format(new Date(session.last_message_at), 'MMM d')}</span>
                              <span>•</span>
                              <span>{session.message_count}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                exportConversation(session.session_id);
                              }}
                              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                              title="Export"
                            >
                              <Download className="h-3 w-3 text-gray-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(session.session_id);
                              }}
                              className="p-0.5 hover:bg-red-100 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs">
                      {searchQuery ? 'No matches' : 'No conversations'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className={`bg-primary-600 text-white p-4 flex items-center justify-between ${
              showHistory ? 'rounded-tr-lg' : 'rounded-t-lg'
            }`}>
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
                  className={`hover:bg-primary-700 p-1 rounded transition-colors ${
                    showHistory ? 'bg-primary-700' : ''
                  }`}
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
                <div className="flex-1 max-w-[85%]">
                  <div
                    className={`p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  </div>

                  {/* Philosophy Alignment Compact Pill - Only for Assistant messages */}
                  {msg.role === 'assistant' && (msg.alignment || msg.validation_status) && (
                    <div className="mt-2">
                      <button
                        onClick={() => setExpandedMessageId(expandedMessageId === msg.id ? null : msg.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          msg.validation_status === 'approved'
                            ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200'
                            : msg.validation_status === 'rejected'
                            ? 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200'
                            : msg.validation_status === 'flagged'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                        }`}
                      >
                        {msg.validation_status === 'approved' && <CheckCircle className="h-3.5 w-3.5" />}
                        {msg.validation_status === 'rejected' && <XCircle className="h-3.5 w-3.5" />}
                        {msg.validation_status === 'flagged' && <AlertCircle className="h-3.5 w-3.5" />}

                        <span>
                          {msg.validation_status === 'approved' && 'Aligned with Philosophy'}
                          {msg.validation_status === 'rejected' && 'Philosophy Conflict'}
                          {msg.validation_status === 'flagged' && 'Review Required'}
                          {!msg.validation_status && msg.alignment && `${msg.alignment.core_values.length} Core Values`}
                        </span>

                        {expandedMessageId === msg.id ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Expanded Philosophy Details */}
                      {expandedMessageId === msg.id && (
                        <div className="mt-2 space-y-2">
                          {msg.validation_status && (
                            <ValidationStatusBadge
                              status={msg.validation_status}
                              violations={msg.violated_constraints}
                              conflictResolution={msg.conflict_resolution}
                              className="ml-0"
                            />
                          )}
                          {msg.alignment && (
                            <PhilosophyAlignmentCard
                              alignment={msg.alignment}
                              className="ml-0"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
            <div className={`p-4 bg-white border-t border-gray-200 ${
              showHistory ? 'rounded-br-lg' : 'rounded-b-lg'
            }`}>
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
    </>
  );
}
