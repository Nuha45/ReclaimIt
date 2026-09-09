import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Package, Settings, Bell, Trash2 } from 'lucide-react';
import { authApi, itemsApi, getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { Item, Notification } from '../types';
import { getInitials, formatRelativeTime, capitalize } from '../lib/utils';
import { STATUS_COLORS, TYPE_COLORS } from '../lib/constants';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  studentId: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type Tab = 'items' | 'settings' | 'notifications';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>('items');
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', studentId: user?.studentId || '' },
  });

  useEffect(() => {
    Promise.all([
      itemsApi.getMyItems(),
      authApi.getNotifications(),
    ])
      .then(([itemsRes, notifRes]) => {
        setMyItems(itemsRes.data.items);
        setNotifications(notifRes.data.notifications);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await itemsApi.delete(id);
      setMyItems((prev) => prev.filter((i) => i._id !== id));
      toast.success('Item deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onSaveProfile = async (data: ProfileForm) => {
    setSaving(true);
    try {
      const res = await authApi.updateProfile(data);
      setUser(res.data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'items' as Tab, label: 'My Items', icon: Package },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-xl font-bold text-accent">
          {getInitials(user?.name || 'U')}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{user?.name}</h1>
          <p className="text-text-secondary">{user?.email}</p>
          {user?.studentId && <p className="text-xs text-text-muted mt-0.5">ID: {user.studentId}</p>}
        </div>
      </div>

      <div className="flex gap-1 mb-8 bg-surface-raised border border-border-subtle rounded-xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === id ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : tab === 'items' ? (
        myItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items posted yet"
            description="Post your first lost or found item."
            action={
              <Link to="/post"><Button>Post an Item</Button></Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {myItems.map((item) => (
              <Card key={item._id} className="!p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <Badge className={TYPE_COLORS[item.type]}>{capitalize(item.type)}</Badge>
                    <Badge className={STATUS_COLORS[item.status]}>{capitalize(item.status)}</Badge>
                  </div>
                  <Link to={`/items/${item._id}`} className="font-medium text-text-primary hover:text-accent transition-colors">
                    {item.title}
                  </Link>
                  <p className="text-sm text-text-muted mt-0.5">{item.location.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item._id)}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </Card>
            ))}
          </div>
        )
      ) : tab === 'notifications' ? (
        notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card key={n._id} className={`!p-4 ${!n.isRead ? 'border-accent/30' : ''}`}>
                <p className="font-medium text-text-primary text-sm">{n.title}</p>
                <p className="text-sm text-text-secondary mt-1">{n.message}</p>
                <p className="text-xs text-text-muted mt-2">{formatRelativeTime(n.createdAt)}</p>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card>
          <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-5">
            <Input label="Full Name" error={errors.name?.message} {...register('name')} />
            <Input label="Student ID" placeholder="Optional" error={errors.studentId?.message} {...register('studentId')} />
            <Input label="Email" value={user?.email || ''} disabled className="opacity-60" />
            <Button type="submit" loading={saving}>Save Changes</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
