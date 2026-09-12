import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Message, User } from '../../types';
import { messagesApi, getErrorMessage } from '../../lib/api';
import { getInitials, refUserId } from '../../lib/utils';
import MessageBubble from './MessageBubble';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

interface ChatWindowProps {
  participant: User;
  currentUserId: string;
  itemId?: string;
  onBack?: () => void;
}

export default function ChatWindow({ participant, currentUserId, itemId, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const { data } = await messagesApi.getMessages(participant._id);
      setMessages(data.messages);
    } catch {
      /* handled by interceptor */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      if (cancelled) return;
      await fetchMessages();
    };

    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [participant._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const { data } = await messagesApi.send({
        receiverId: participant._id,
        content: content.trim(),
        itemId,
      });
      setMessages((prev) => [...prev, data.message]);
      setContent('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b border-border-subtle shrink-0">
        {onBack && (
          <Button type="button" variant="ghost" size="sm" className="!p-2 md:hidden shrink-0" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center text-sm font-bold text-accent shrink-0">
          {getInitials(participant.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-primary truncate">{participant.name}</p>
          {participant.email ? (
            <p className="text-xs text-text-muted truncate">{participant.email}</p>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-5 py-4 space-y-3"
      >
        {loading ? (
          <Spinner className="py-10" />
        ) : messages.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-10">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={refUserId(msg.sender) === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 border-t border-border-subtle shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-surface-raised"
      >
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          enterKeyHint="send"
          className="flex-1 min-w-0 px-4 py-2.5 text-base sm:text-sm bg-surface-overlay border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-[44px]"
        />
        <Button
          type="submit"
          loading={sending}
          disabled={!content.trim()}
          className="shrink-0 min-h-[44px] min-w-[44px] !px-3"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
