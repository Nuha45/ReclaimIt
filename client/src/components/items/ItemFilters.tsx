import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { ItemFilters } from '../../types';
import { CATEGORIES, ITEM_CONDITIONS } from '../../lib/constants';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

interface ItemFiltersBarProps {
  filters: ItemFilters;
  onChange: (filters: ItemFilters) => void;
  onReset: () => void;
}

export default function ItemFiltersBar({ filters, onChange, onReset }: ItemFiltersBarProps) {
  const hasFilters = Object.values(filters).some((v) => v && v !== 1);

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <SlidersHorizontal className="w-4 h-4" />
        <span className="text-sm font-medium">Filters</span>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto !text-xs">
            <X className="w-3.5 h-3.5" /> Clear all
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <Input
            placeholder="Search items..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
            className="!pl-10"
          />
        </div>

        <Select
          placeholder="All types"
          options={[
            { value: 'lost', label: 'Lost' },
            { value: 'found', label: 'Found' },
          ]}
          value={filters.type || ''}
          onChange={(e) => onChange({ ...filters, type: e.target.value as ItemFilters['type'], page: 1 })}
        />

        <Select
          placeholder="All categories"
          options={CATEGORIES}
          value={filters.category || ''}
          onChange={(e) => onChange({ ...filters, category: e.target.value as ItemFilters['category'], page: 1 })}
        />

        <Input
          placeholder="Location..."
          value={filters.location || ''}
          onChange={(e) => onChange({ ...filters, location: e.target.value, page: 1 })}
        />

        <Input
          placeholder="Color..."
          value={filters.color || ''}
          onChange={(e) => onChange({ ...filters, color: e.target.value, page: 1 })}
        />

        <Input
          placeholder="Brand..."
          value={filters.brand || ''}
          onChange={(e) => onChange({ ...filters, brand: e.target.value, page: 1 })}
        />

        <Input
          placeholder="Size..."
          value={filters.size || ''}
          onChange={(e) => onChange({ ...filters, size: e.target.value, page: 1 })}
        />

        <Select
          placeholder="All statuses"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'claimed', label: 'Claimed' },
            { value: 'resolved', label: 'Resolved' },
          ]}
          value={filters.status || ''}
          onChange={(e) => onChange({ ...filters, status: e.target.value as ItemFilters['status'], page: 1 })}
        />

        <Select
          placeholder="Any condition"
          options={ITEM_CONDITIONS}
          value={filters.condition || ''}
          onChange={(e) => onChange({ ...filters, condition: e.target.value, page: 1 })}
        />

        <Input
          label="From date"
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => onChange({ ...filters, startDate: e.target.value, page: 1 })}
        />

        <Input
          label="To date"
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => onChange({ ...filters, endDate: e.target.value, page: 1 })}
        />
      </div>
    </div>
  );
}
