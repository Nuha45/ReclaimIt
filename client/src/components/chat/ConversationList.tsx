import type { Conversation } from '../../types';
import { formatRelativeTime, getInitials } from '../../lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  activeUserId?: string;
  onSelect: (userId: string) => void;
}

export default function ConversationList({ conversations, activeUserId, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm p-6 text-center">
        No conversations yet. Message someone from an item page to start chatting.
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {conversations.map(({ participant, lastMessage, unreadCount }) => (
        <button
          key={participant._id}
          onClick={() => onSelect(participant._id)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-overlay transition-colors cursor-pointer text-left ${
            activeUserId === participant._id ? 'bg-accent/10 border-r-2 border-accent' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
            {getInitials(participant.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-text-primary truncate">{participant.name}</span>
              <span className="text-[10px] text-text-muted flex-shrink-0">
                {formatRelativeTime(lastMessage.createdAt)}
              </span>
            </div>
            <p className="text-xs text-text-secondary truncate mt-0.5">{lastMessage.content}</p>
          </div>
          {unreadCount > 0 && (
            <span className="w-5 h-5 bg-accent text-surface text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
