import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api';
import { MessageSquare, Trash2, Search, Calendar, Download, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface ChatSession {
  session_id: string;
  title?: string;
  created_at: string;
  last_message_at: string;
  message_count: number;
  first_user_message: string;
}

interface ChatHistorySidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatHistorySidebar({
  currentSessionId,
  onSelectSession,
  onNewChat,
  isOpen,
  onClose,
}: ChatHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery<ChatSession[]>({
    queryKey: ['chat-sessions'],
    queryFn: () => aiApi.getChatSessions().then((res) => res.data),
    enabled: isOpen,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => aiApi.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      setShowDeleteConfirm(null);
    },
  });

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

  const filteredSessions = sessions?.filter((session) =>
    session.first_user_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSessionTitle = (session: ChatSession) => {
    // Prefer AI-generated title, fall back to truncated first message
    if (session.title) {
      return session.title;
    }
    if (session.first_user_message) {
      return session.first_user_message.length > 40
        ? session.first_user_message.substring(0, 40) + '...'
        : session.first_user_message;
    }
    return 'New conversation';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col">
      {/* Header */}
      <div className="bg-primary-600 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Chat History</h3>
          <button
            onClick={onClose}
            className="hover:bg-primary-700 p-1 rounded transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="w-full bg-white text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading conversations...</div>
        ) : filteredSessions && filteredSessions.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredSessions.map((session) => (
              <div
                key={session.session_id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative group ${
                  currentSessionId === session.session_id ? 'bg-primary-50 border-l-4 border-primary-600' : ''
                }`}
                onClick={() => onSelectSession(session.session_id)}
              >
                {/* Delete Confirmation Overlay */}
                {showDeleteConfirm === session.session_id && (
                  <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-10 p-4">
                    <p className="text-sm text-gray-900 font-medium mb-3 text-center">
                      Delete this conversation?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSessionMutation.mutate(session.session_id);
                        }}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(null);
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {getSessionTitle(session)}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(session.last_message_at), 'MMM d, yyyy')}</span>
                      <span>•</span>
                      <span>{session.message_count} messages</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportConversation(session.session_id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Export conversation"
                    >
                      <Download className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(session.session_id);
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {searchQuery ? 'Try a different search term' : 'Start chatting to create your first conversation'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
