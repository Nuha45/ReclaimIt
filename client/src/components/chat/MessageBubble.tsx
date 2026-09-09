import type { Message } from '../../types';
import { formatRelativeTime } from '../../lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-accent text-surface rounded-br-md'
            : 'bg-surface-overlay border border-border text-text-primary rounded-bl-md'
        }`}
      >
        <p>{message.content}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? 'text-surface/60' : 'text-text-muted'}`}>
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
