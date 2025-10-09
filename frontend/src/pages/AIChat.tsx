import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api';
import { Send, Bot, User } from 'lucide-react';

export default function AIChat() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: chatHistory } = useQuery({
    queryKey: ['chat', sessionId],
    queryFn: () => aiApi.getChatHistory(sessionId).then((res) => res.data),
    initialData: [],
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => aiApi.chat(msg, sessionId),
    onSuccess: (response) => {
      try {
        queryClient.invalidateQueries({ queryKey: ['chat', sessionId] });

        // If actions were executed, refresh relevant data
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      chatMutation.mutate(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Chief Strategy Officer</h1>
        <p className="mt-2 text-gray-600">
          Get strategic insights and guidance from your AI advisor
        </p>
      </div>

      {/* Chat Interface */}
      <div className="card h-[calc(100vh-20rem)] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {chatHistory && chatHistory.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Start a conversation with your AI Chief Strategy Officer
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Ask about strategic planning, KPIs, OGSM alignment, or get recommendations
              </p>
            </div>
          )}

          {Array.isArray(chatHistory) && chatHistory.map((msg: any) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === 'user'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={`flex-1 p-4 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-primary-50 text-gray-900'
                    : 'bg-gray-50 text-gray-900'
                }`}
              >
                <p className="text-sm font-medium mb-1 capitalize">{msg.role}</p>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1 p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">Thinking...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex space-x-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask your AI Chief Strategy Officer..."
            className="flex-1 input"
            disabled={chatMutation.isPending}
          />
          <button
            type="submit"
            disabled={!message.trim() || chatMutation.isPending}
            className="btn btn-primary flex items-center"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
