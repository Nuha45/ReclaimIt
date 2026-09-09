import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Package, AlertTriangle, ShieldBan, Activity,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import type { AdminStats, Item, Violation } from '../../types';
import { formatRelativeTime, capitalize } from '../../lib/utils';
import { TYPE_COLORS } from '../../lib/constants';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [recentViolations, setRecentViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard()
      .then(({ data }) => {
        setStats(data.stats);
        setRecentItems(data.recentItems);
        setRecentViolations(data.recentViolations);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-20" />;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Total Items', value: stats?.totalItems ?? 0, icon: Package, color: 'text-accent' },
    { label: 'Active Items', value: stats?.activeItems ?? 0, icon: Activity, color: 'text-emerald-400' },
    { label: 'Pending Reports', value: stats?.pendingViolations ?? 0, icon: AlertTriangle, color: 'text-amber-400' },
    { label: 'Banned Users', value: stats?.bannedUsers ?? 0, icon: ShieldBan, color: 'text-red-400' },
  ];

  const adminLinks = [
    { to: '/admin/users', label: 'Manage Users' },
    { to: '/admin/items', label: 'Moderate Items' },
    { to: '/admin/violations', label: 'Review Reports' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
      <p className="text-text-secondary mb-8">Platform overview and moderation tools</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="!p-5">
            <Icon className={`w-5 h-5 ${color} mb-3`} />
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-10">
        {adminLinks.map(({ to, label }) => (
          <Link key={to} to={to} className="px-5 py-2.5 rounded-xl bg-accent/10 text-accent border border-accent/30 text-sm font-medium hover:bg-accent/20 transition-colors">
            {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Items</h2>
          <div className="space-y-3">
            {recentItems.map((item) => (
              <Card key={item._id} className="!p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-text-primary text-sm">{item.title}</p>
                  <p className="text-xs text-text-muted">{item.postedBy?.name} · {formatRelativeTime(item.createdAt)}</p>
                </div>
                <Badge className={TYPE_COLORS[item.type]}>{capitalize(item.type)}</Badge>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Pending Reports</h2>
          <div className="space-y-3">
            {recentViolations.length === 0 ? (
              <p className="text-text-muted text-sm">No pending reports</p>
            ) : (
              recentViolations.map((v) => (
                <Card key={v._id} className="!p-4">
                  <p className="font-medium text-text-primary text-sm">{capitalize(v.reason)}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {v.reportedBy?.name} reported {v.reportedUser?.name} · {formatRelativeTime(v.createdAt)}
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
