import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api';
import { Send, Bot, User, X, MessageSquare, Minimize2, CheckCircle, Zap } from 'lucide-react';
import { parseUserIntent, executeAction, type AIAction } from '@/services/aiActions';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  created_at?: string;
  action?: {
    type: string;
    status: 'pending' | 'completed' | 'failed';
    data?: any;
  };
}

export default function AIChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', sessionId] });
      setMessage('');
    },
  });

  const actionMutation = useMutation({
    mutationFn: executeAction,
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['kpis'] });
        queryClient.invalidateQueries({ queryKey: ['ogsm'] });
      }
    },
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !chatMutation.isPending) {
      // Parse for action intent
      const action = parseUserIntent(message);

      if (action.type !== 'none' && action.requiresConfirmation) {
        // Check if we have enough parameters to execute
        const hasRequiredParams = validateActionParameters(action);

        if (hasRequiredParams) {
          setPendingAction(action);
        }
      }

      // Always send the message to AI for response
      chatMutation.mutate(message);
    }
  };

  const handleExecuteAction = async () => {
    if (pendingAction) {
      const result = await actionMutation.mutateAsync(pendingAction);

      // Send confirmation message to chat
      const confirmMessage = result.success
        ? `✓ Action completed: ${result.message}`
        : `✗ Action failed: ${result.message}`;

      await aiApi.chat(confirmMessage, sessionId);
      queryClient.invalidateQueries({ queryKey: ['chat', sessionId] });

      setPendingAction(null);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
  };

  const validateActionParameters = (action: AIAction): boolean => {
    if (!action.parameters) return false;

    switch (action.type) {
      case 'add_kpi':
        return !!action.parameters.name;
      case 'add_objective':
      case 'add_goal':
      case 'add_strategy':
        return !!action.parameters.title;
      default:
        return true;
    }
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

            {chatHistory?.map((msg: Message) => (
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
                  {msg.action && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Action: {msg.action.type} - {msg.action.status}
                      </p>
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

          {/* Pending Action Confirmation */}
          {pendingAction && (
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
              <div className="flex items-start space-x-2">
                <Zap className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-900">Action Ready</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Execute: {pendingAction.type.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={handleExecuteAction}
                    disabled={actionMutation.isPending}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                  >
                    <CheckCircle className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleCancelAction}
                    disabled={actionMutation.isPending}
                    className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

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
    </>
  );
}
