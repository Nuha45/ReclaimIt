import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, Check, X } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../lib/api';
import type { Violation } from '../../types';
import { capitalize, formatRelativeTime } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

export default function AdminViolations() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchViolations = () => {
    adminApi.getViolations({ status: 'pending' })
      .then(({ data }) => setViolations(data.violations))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchViolations(); }, []);

  const handleReview = async (id: string, status: 'confirmed' | 'dismissed') => {
    setActionId(id);
    try {
      await adminApi.reviewViolation(id, { status });
      toast.success(`Report ${status}`);
      setViolations((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    confirmed: 'bg-red-500/15 text-red-400 border-red-500/30',
    dismissed: 'bg-surface-overlay text-text-secondary border-border',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <h1 className="text-3xl font-bold text-text-primary mb-8">Violation Reports</h1>

      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : violations.length === 0 ? (
        <p className="text-text-muted">No pending reports to review.</p>
      ) : (
        <div className="space-y-4">
          {violations.map((v) => (
            <Card key={v._id} className="!p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusColor[v.status]}>{capitalize(v.status)}</Badge>
                <Badge className="bg-surface-overlay text-text-secondary border-border">
                  {capitalize(v.reason)}
                </Badge>
              </div>
              <p className="text-text-primary">
                <span className="font-medium">{v.reportedBy?.name}</span>
                {' reported '}
                <span className="font-medium">{v.reportedUser?.name}</span>
                {v.item && <> regarding &ldquo;{v.item.title}&rdquo;</>}
              </p>
              {v.description && <p className="text-sm text-text-secondary">{v.description}</p>}
              <p className="text-xs text-text-muted">{formatRelativeTime(v.createdAt)}</p>
              {v.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" loading={actionId === v._id} onClick={() => handleReview(v._id, 'confirmed')}>
                    <Check className="w-4 h-4" /> Confirm
                  </Button>
                  <Button variant="secondary" size="sm" loading={actionId === v._id} onClick={() => handleReview(v._id, 'dismissed')}>
                    <X className="w-4 h-4" /> Dismiss
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
