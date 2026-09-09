import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { authApi } from '../../lib/api';
import type { Notification } from '../../types';
import { cn, formatRelativeTime } from '../../lib/utils';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = () => {
    authApi
      .getNotifications({ page: 1 })
      .then(({ data }) => {
        setNotifications(data.notifications.slice(0, 8));
        setUnread(data.unreadCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openNotification = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await authApi.markNotificationRead(n._id);
        setUnread((c) => Math.max(0, c - 1));
        setNotifications((list) => list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);

    if (n.type === 'new_message' || n.type === 'claim_verified') {
      const userId = n.relatedUser?._id;
      const itemId = n.relatedItem?._id;
      if (userId) {
        navigate(`/chat?user=${userId}${itemId ? `&item=${itemId}` : ''}`);
        return;
      }
      navigate('/chat');
      return;
    }

    if (n.relatedItem?._id) {
      navigate(`/items/${n.relatedItem._id}`);
      return;
    }

    navigate('/profile');
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-accent text-surface text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-auto rounded-2xl border border-border-subtle bg-surface-raised shadow-2xl shadow-black/40 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <p className="text-sm font-semibold text-text-primary">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-accent hover:underline cursor-pointer"
                onClick={async () => {
                  await authApi.markAllNotificationsRead();
                  setUnread(0);
                  setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-sm text-text-muted text-center">No notifications yet</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n._id}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-border-subtle/70 hover:bg-surface-overlay/80 transition-colors cursor-pointer',
                      !n.isRead && 'bg-accent/5'
                    )}
                  >
                    <p className="text-sm font-medium text-text-primary">{n.title}</p>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-text-muted mt-1.5">{formatRelativeTime(n.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block text-center text-xs text-accent py-3 hover:bg-surface-overlay"
          >
            View all in Profile
          </Link>
        </div>
      )}
    </div>
  );
}
