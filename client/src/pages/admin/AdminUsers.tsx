import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, ShieldBan, ShieldCheck, Crown } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../lib/api';
import type { User } from '../../types';
import { formatDate, getInitials } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchUsers = () => {
    adminApi.getUsers()
      .then(({ data }) => setUsers(data.users))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = async (id: string) => {
    setActionId(id);
    try {
      await adminApi.banUser(id);
      toast.success('User banned');
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const handleUnban = async (id: string) => {
    setActionId(id);
    try {
      await adminApi.unbanUser(id);
      toast.success('User unbanned');
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const handlePromote = async (id: string) => {
    setActionId(id);
    try {
      await adminApi.promoteUser(id);
      toast.success('User promoted to admin');
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <h1 className="text-3xl font-bold text-text-primary mb-8">User Management</h1>

      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u._id} className="!p-4 flex flex-wrap items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                {getInitials(u.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-primary">{u.name}</p>
                  {u.role === 'admin' && (
                    <Badge className="bg-accent/15 text-accent border-accent/30">Admin</Badge>
                  )}
                  {u.isBanned && (
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Banned</Badge>
                  )}
                </div>
                <p className="text-sm text-text-muted">{u.email}</p>
                <p className="text-xs text-text-muted">
                  Joined {formatDate(u.createdAt!)}
                  {u.averageRating ? ` · ★ ${u.averageRating}` : ''}
                  {u.isRatingFlagged ? ' · LOW RATING FLAG' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {u.role !== 'admin' && (
                  <>
                    {u.isBanned ? (
                      <Button variant="secondary" size="sm" loading={actionId === u._id} onClick={() => handleUnban(u._id)}>
                        <ShieldCheck className="w-4 h-4" /> Unban
                      </Button>
                    ) : (
                      <Button variant="danger" size="sm" loading={actionId === u._id} onClick={() => handleBan(u._id)}>
                        <ShieldBan className="w-4 h-4" /> Ban
                      </Button>
                    )}
                    {u.isRatingFlagged && (
                      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 self-center">Flagged</Badge>
                    )}
                    <Button variant="outline" size="sm" loading={actionId === u._id} onClick={() => handlePromote(u._id)}>
                      <Crown className="w-4 h-4" /> Promote
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
