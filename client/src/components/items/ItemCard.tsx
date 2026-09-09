import { Link } from 'react-router-dom';
import { MapPin, Calendar } from 'lucide-react';
import type { Item } from '../../types';
import { TYPE_COLORS, STATUS_COLORS } from '../../lib/constants';
import { formatDate, getImageUrl, capitalize } from '../../lib/utils';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

interface ItemCardProps {
  item: Item;
}

export default function ItemCard({ item }: ItemCardProps) {
  const imageUrl = getImageUrl(item.images?.[0]);

  return (
    <Link to={`/items/${item._id}`}>
      <Card hover className="!p-0 overflow-hidden h-full flex flex-col">
        <div className="relative aspect-[4/3] bg-surface-overlay">
          {imageUrl ? (
            <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
              No image
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className={TYPE_COLORS[item.type]}>{capitalize(item.type)}</Badge>
            {item.status !== 'active' && (
              <Badge className={STATUS_COLORS[item.status]}>{capitalize(item.status)}</Badge>
            )}
          </div>
          {item.matchScore !== undefined && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-accent/20 text-accent border-accent/40">{item.matchScore}% match</Badge>
            </div>
          )}
        </div>
        <div className="p-5 flex-1 flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-text-primary line-clamp-1 mb-1">{item.title}</h3>
            <p className="text-sm text-text-secondary line-clamp-2">{item.description}</p>
          </div>
          <div className="mt-auto space-y-1.5 text-xs text-text-muted">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {item.location.name}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(item.dateLostFound)}
            </div>
          </div>
          <Badge className="self-start bg-surface-overlay text-text-secondary border-border">
            {capitalize(item.category)}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}
