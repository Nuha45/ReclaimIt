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
import Button from '../components/ui/Button';

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
        if (conv) {
          setActiveUser(conv.participant);
        } else {
          setActiveUser((prev) =>
            prev?._id === activeUserId ? prev : { _id: activeUserId, name: 'User', email: '' }
          );
        }
      }
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (cancelled) return;
      await fetchConversations();
    };

    load();
    const interval = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeUserId]);

  const handleSelect = (userId: string) => {
    const next: Record<string, string> = { user: userId };
    if (itemId) next.item = itemId;
    setSearchParams(next);
    const conv = conversations.find((c) => c.participant._id === userId);
    if (conv) setActiveUser(conv.participant);
    else setActiveUser({ _id: userId, name: 'User', email: '' });
  };

  const handleBackToList = () => {
    setSearchParams(itemId ? { item: itemId } : {});
    setActiveUser(null);
  };

  const showMobileChat = Boolean(activeUserId && activeUser);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-10 min-w-0 flex flex-col h-[calc(100dvh-4rem)] md:h-auto md:min-h-0">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary mb-4 sm:mb-6 shrink-0">
        Messages
      </h1>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 md:h-[calc(100vh-220px)] md:min-h-[500px] bg-surface-raised border border-border-subtle rounded-2xl overflow-hidden">
        <div
          className={`md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle overflow-hidden min-h-0 ${
            showMobileChat ? 'hidden md:block' : 'block'
          } ${showMobileChat ? '' : 'max-h-[45dvh] md:max-h-none'}`}
        >
          <ConversationList
            conversations={conversations}
            activeUserId={activeUserId}
            onSelect={handleSelect}
          />
        </div>

        <div
          className={`md:col-span-2 min-h-0 flex flex-col ${
            showMobileChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeUser && user ? (
            <ChatWindow
              participant={activeUser}
              currentUserId={user._id}
              itemId={itemId}
              onBack={showMobileChat ? handleBackToList : undefined}
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

      {!showMobileChat && activeUserId && !activeUser && (
        <div className="md:hidden mt-3">
          <Button className="w-full" onClick={() => handleSelect(activeUserId)}>
            Open conversation
          </Button>
        </div>
      )}
    </div>
  );
}
