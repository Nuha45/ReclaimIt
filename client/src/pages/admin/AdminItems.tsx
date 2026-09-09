import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../lib/api';
import type { Item } from '../../types';
import { capitalize } from '../../lib/utils';
import { TYPE_COLORS, STATUS_COLORS } from '../../lib/constants';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

export default function AdminItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchItems = () => {
    adminApi.getItems()
      .then(({ data }) => setItems(data.items))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, []);

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this item from the platform?')) return;
    setActionId(id);
    try {
      await adminApi.deleteItem(id);
      toast.success('Item removed');
      setItems((prev) => prev.filter((i) => i._id !== id));
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
      <h1 className="text-3xl font-bold text-text-primary mb-8">Item Moderation</h1>

      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item._id} className="!p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 mb-1">
                  <Badge className={TYPE_COLORS[item.type]}>{capitalize(item.type)}</Badge>
                  <Badge className={STATUS_COLORS[item.status]}>{capitalize(item.status)}</Badge>
                  {item.isFlagged && (
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Flagged</Badge>
                  )}
                </div>
                <Link to={`/items/${item._id}`} className="font-medium text-text-primary hover:text-accent">
                  {item.title}
                </Link>
                <p className="text-sm text-text-muted">by {item.postedBy?.name}</p>
              </div>
              <Button variant="danger" size="sm" loading={actionId === item._id} onClick={() => handleRemove(item._id)}>
                <Trash2 className="w-4 h-4" /> Remove
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
