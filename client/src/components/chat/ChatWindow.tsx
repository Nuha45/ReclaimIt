import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Message, User } from '../../types';
import { messagesApi, getErrorMessage } from '../../lib/api';
import { getInitials } from '../../lib/utils';
import MessageBubble from './MessageBubble';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

interface ChatWindowProps {
  participant: User;
  currentUserId: string;
  itemId?: string;
}

export default function ChatWindow({ participant, currentUserId, itemId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    setLoading(true);
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
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
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
        <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
          {getInitials(participant.name)}
        </div>
        <div>
          <p className="font-medium text-text-primary">{participant.name}</p>
          <p className="text-xs text-text-muted">{participant.email}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading ? (
          <Spinner className="py-10" />
        ) : messages.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-10">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={msg.sender._id === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-3 px-5 py-4 border-t border-border-subtle">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 bg-surface-overlay border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <Button type="submit" loading={sending} disabled={!content.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
