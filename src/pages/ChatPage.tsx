import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase, ChatMessage } from '../lib/supabase';
import { sendToN8N } from '../lib/n8n';

const generateFallbackResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! I'm your property assistant. I can help you find properties, answer questions about locations, pricing, and more. What would you like to know?";
  }

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
    return "I can help you with pricing information! Properties range from budget-friendly apartments to luxury villas. What's your budget range, and which city are you interested in?";
  }

  if (lowerMessage.includes('bangalore') || lowerMessage.includes('mumbai') || lowerMessage.includes('delhi') || lowerMessage.includes('hyderabad') || lowerMessage.includes('pune') || lowerMessage.includes('chennai') || lowerMessage.includes('goa')) {
    const city = lowerMessage.match(/(bangalore|mumbai|delhi|hyderabad|pune|chennai|goa)/i)?.[0];
    return `Great choice! ${city ? city.charAt(0).toUpperCase() + city.slice(1) : 'That city'} has excellent properties available. Would you like to see apartments, villas, or plots? Also, what's your budget range?`;
  }

  if (lowerMessage.includes('apartment') || lowerMessage.includes('villa') || lowerMessage.includes('plot')) {
    return "Excellent! I can show you some great options. To help narrow down the search, could you tell me:\n1. Which city?\n2. Your budget range?\n3. How many bedrooms you need?";
  }

  if (lowerMessage.includes('bedroom') || lowerMessage.includes('bhk')) {
    return "Got it! The number of bedrooms is important. We have properties ranging from 1 BHK to 5+ BHK. Would you like me to show you properties in a specific city and price range?";
  }

  if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('show')) {
    return "I can help you search for properties! To get the best matches, please tell me:\n• Preferred city\n• Budget range\n• Property type (apartment/villa/plot)\n• Number of bedrooms\n\nOr you can use the Search tab to browse all properties!";
  }

  if (lowerMessage.includes('match') || lowerMessage.includes('recommendation')) {
    return "To see personalized property matches, make sure you've completed your preference survey! Then check the Matches tab where I'll show you properties that perfectly match your criteria.";
  }

  return "I'm here to help you find the perfect property! You can ask me about:\n• Available properties in different cities\n• Pricing and budget options\n• Property types (apartments, villas, plots)\n• Specific locations or neighborhoods\n\nWhat would you like to know?";
};

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    const newMessage: ChatMessage = {
      id: Math.random().toString(),
      user_id: user.id,
      message: userMessage,
      timestamp: new Date().toISOString(),
      is_user: true,
    };

    setMessages([...messages, newMessage]);

    await supabase.from('chat_messages').insert({
      user_id: user.id,
      message: userMessage,
      is_user: true,
    });

    try {
      let botReply = "";

      try {
        const response = await sendToN8N({
          event: 'chat',
          user_id: user.id,
          message: userMessage,
        });

        botReply = response?.reply || response?.message || response?.response || "";

        if (response?.telegram_message) {
          addNotification(response.telegram_message, 'info');
        }
      } catch (webhookError) {
        console.error('Webhook error, using fallback response:', webhookError);
        botReply = generateFallbackResponse(userMessage);
      }

      if (!botReply) {
        botReply = generateFallbackResponse(userMessage);
      }

      const botMessage: ChatMessage = {
        id: Math.random().toString(),
        user_id: user.id,
        message: botReply,
        timestamp: new Date().toISOString(),
        is_user: false,
      };

      setMessages(prev => [...prev, botMessage]);

      await supabase.from('chat_messages').insert({
        user_id: user.id,
        message: botReply,
        is_user: false,
      });
    } catch (error) {
      console.error('Chat error:', error);
      addNotification('Failed to send message', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-full">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Property AI Assistant
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ask me anything about properties
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Start a Conversation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Ask me about properties, locations, prices, or anything else!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.is_user ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-[80%] ${
                    message.is_user ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.is_user
                        ? 'bg-blue-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    {message.is_user ? (
                      <UserIcon className="h-5 w-5 text-white" />
                    ) : (
                      <Bot className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    )}
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.is_user
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.is_user
                          ? 'text-blue-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="h-5 w-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
