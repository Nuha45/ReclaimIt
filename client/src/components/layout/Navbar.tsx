import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  MessageCircle,
  User,
  Shield,
  LogOut,
  Menu,
  X,
  Package,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { messagesApi } from '../../lib/api';
import { cn, getInitials } from '../../lib/utils';
import Button from '../ui/Button';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    const fetchUnread = () => {
      messagesApi
        .getUnreadCount()
        .then(({ data }) => {
          if (!cancelled) setUnreadCount(data.unreadCount);
        })
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const navLinks = [
    { to: '/browse', label: 'Browse', icon: Search },
    ...(isAuthenticated
      ? [
          { to: '/post', label: 'Post Item', icon: PlusCircle },
          { to: '/chat', label: 'Messages', icon: MessageCircle, badge: unreadCount },
          { to: '/profile', label: 'Profile', icon: User },
        ]
      : []),
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center group-hover:bg-accent/25 transition-colors">
              <Package className="w-5 h-5 text-accent" />
            </div>
            <span className="font-display text-xl font-bold text-text-primary tracking-tight">
              Reclaim<span className="text-accent">It</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon, badge }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  isActive(to)
                    ? 'text-accent bg-accent/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
                {badge ? (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-surface text-[10px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-surface-overlay border border-border-subtle">
                  <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                    {getInitials(user?.name || 'U')}
                  </div>
                  <span className="text-sm text-text-secondary">{user?.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-xl text-text-secondary hover:bg-surface-overlay cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border-subtle bg-surface-raised px-4 py-4 space-y-1">
          {isAuthenticated && (
            <div className="flex justify-end pb-2">
              <NotificationBell />
            </div>
          )}
          {navLinks.map(({ to, label, icon: Icon, badge }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
                isActive(to) ? 'text-accent bg-accent/10' : 'text-text-secondary'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
              {badge ? (
                <span className="ml-auto px-2 py-0.5 bg-accent text-surface text-xs font-bold rounded-full">
                  {badge}
                </span>
              ) : null}
            </Link>
          ))}
          {!isAuthenticated && (
            <div className="flex gap-2 pt-3 border-t border-border-subtle">
              <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button variant="secondary" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link to="/signup" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Sign up</Button>
              </Link>
            </div>
          )}
          {isAuthenticated && (
            <Button variant="ghost" className="w-full mt-2" onClick={() => { logout(); setMobileOpen(false); }}>
              <LogOut className="w-4 h-4" /> Log out
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
