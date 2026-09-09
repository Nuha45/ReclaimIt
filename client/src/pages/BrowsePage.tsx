import { useCallback, useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { itemsApi } from '../lib/api';
import type { Item, ItemFilters, Pagination } from '../types';
import ItemCard from '../components/items/ItemCard';
import ItemFiltersBar from '../components/items/ItemFilters';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

const defaultFilters: ItemFilters = { page: 1, sort: '-createdAt' };

export default function BrowsePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<ItemFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [searchDebounce, setSearchDebounce] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchDebounce, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined)
      );
      const { data } = await itemsApi.getAll(params);
      setItems(data.items);
      setPagination(data.pagination);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Browse Items</h1>
        <p className="text-text-secondary">Search and filter lost & found items across campus</p>
      </div>

      <div className="mb-8">
        <ItemFiltersBar
          filters={{ ...filters, search: searchDebounce }}
          onChange={(f) => {
            if (f.search !== searchDebounce) setSearchDebounce(f.search);
            else setFilters(f);
          }}
          onReset={() => {
            setSearchDebounce('');
            setFilters(defaultFilters);
          }}
        />
      </div>

      {loading ? (
        <div className="py-20">
          <Spinner size="lg" className="mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No items found"
          description="Try adjusting your filters or post a new item."
        />
      ) : (
        <>
          <p className="text-sm text-text-muted mb-6">
            {pagination?.total ?? items.length} item{(pagination?.total ?? items.length) !== 1 ? 's' : ''} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-3 mt-10">
              <Button
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm text-text-secondary px-4">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
