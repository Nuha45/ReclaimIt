import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { messagesApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { Conversation, User } from '../types';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function ChatPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const activeUserId = searchParams.get('user') || undefined;
  const itemId = searchParams.get('item') || undefined;

  const fetchConversations = async () => {
    try {
      const { data } = await messagesApi.getConversations();
      setConversations(data.conversations);

      if (activeUserId) {
        const conv = data.conversations.find((c) => c.participant._id === activeUserId);
        if (conv) setActiveUser(conv.participant);
        else if (data.conversations.length === 0) {
          // New conversation — create minimal user object from URL
          setActiveUser({ _id: activeUserId, name: 'User', email: '' });
        }
      }
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [activeUserId]);

  const handleSelect = (userId: string) => {
    setSearchParams({ user: userId });
    const conv = conversations.find((c) => c.participant._id === userId);
    if (conv) setActiveUser(conv.participant);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-text-primary mb-6">Messages</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-220px)] min-h-[500px] bg-surface-raised border border-border-subtle rounded-2xl overflow-hidden">
        <div className="md:col-span-1 border-r border-border-subtle overflow-hidden">
          <ConversationList
            conversations={conversations}
            activeUserId={activeUserId}
            onSelect={handleSelect}
          />
        </div>

        <div className="md:col-span-2">
          {activeUser && user ? (
            <ChatWindow
              participant={activeUser}
              currentUserId={user._id}
              itemId={itemId}
            />
          ) : (
            <EmptyState
              icon={MessageCircle}
              title="Select a conversation"
              description="Choose a conversation from the list or message someone from an item page."
            />
          )}
        </div>
      </div>
    </div>
  );
}
