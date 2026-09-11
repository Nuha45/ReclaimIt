import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Package, AlertTriangle, ShieldBan, Activity,
  Percent, Flag, TrendingUp,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import type { AdminStats, Item, Violation } from '../../types';
import { formatRelativeTime, capitalize } from '../../lib/utils';
import { TYPE_COLORS } from '../../lib/constants';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

function CategoryBars({ data }: { data: { category: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-3">
      {data.map(({ category, count }) => (
        <div key={category}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-secondary capitalize">{category}</span>
            <span className="text-text-muted">{count}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-overlay overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent transition-all duration-700"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-text-muted">No category data yet</p>}
    </div>
  );
}

function Donut({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[100px] h-[100px]">
        <svg width="100" height="100" className="-rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#1a1f2e" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#ffb347"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-text-primary">{clamped}%</span>
        </div>
      </div>
      <p className="text-xs text-text-muted text-center">{label}</p>
    </div>
  );
}

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
    { label: 'Open Items', value: stats?.activeItems ?? 0, icon: Activity, color: 'text-emerald-400' },
    { label: 'Active Users (30d)', value: stats?.activeUsers ?? 0, icon: TrendingUp, color: 'text-sky-400' },
    { label: 'Success Rate', value: `${stats?.successRate ?? 0}%`, icon: Percent, color: 'text-emerald-300' },
    { label: 'Fraud Reports', value: stats?.fraudReports ?? 0, icon: Flag, color: 'text-amber-400' },
    { label: 'Pending Reports', value: stats?.pendingViolations ?? 0, icon: AlertTriangle, color: 'text-amber-300' },
    { label: 'Banned Users', value: stats?.bannedUsers ?? 0, icon: ShieldBan, color: 'text-red-400' },
    { label: 'Low-rated Flags', value: stats?.flaggedUsers ?? 0, icon: AlertTriangle, color: 'text-red-300' },
  ];

  const adminLinks = [
    { to: '/admin/users', label: 'Manage Users' },
    { to: '/admin/items', label: 'Moderate Items' },
    { to: '/admin/violations', label: 'Review Reports' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-3xl font-semibold text-text-primary mb-2">Admin Analytics</h1>
      <p className="text-text-secondary mb-8">Platform health, recovery success, and fraud signals</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-10">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="!p-5">
            <Icon className={`w-5 h-5 ${color} mb-3`} />
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <Card className="!p-6 lg:col-span-2">
          <h2 className="font-display font-semibold text-text-primary mb-4">Top categories</h2>
          <CategoryBars data={stats?.topCategories || []} />
        </Card>
        <Card className="!p-6 flex flex-col items-center gap-6">
          <h2 className="font-display font-semibold text-text-primary self-start w-full">Recovery metrics</h2>
          <Donut value={stats?.successRate ?? 0} label="Resolved / total items" />
          <Donut value={stats?.recoveryRate ?? 0} label="In progress + returned" />
        </Card>
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
                  <p className="text-xs text-text-muted">
                    {item.postedBy?.name}
                    {item.postedBy?.isRatingFlagged ? ' · flagged rating' : ''}
                    {' · '}
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
                <Badge className={TYPE_COLORS[item.type]}>{capitalize(item.type)}</Badge>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Pending Fraud Reports</h2>
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
