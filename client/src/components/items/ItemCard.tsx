import { Link } from 'react-router-dom';
import { MapPin, Calendar } from 'lucide-react';
import type { Item } from '../../types';
import { TYPE_COLORS, STATUS_COLORS } from '../../lib/constants';
import { formatDate, getImageUrl, capitalize, getDisplayStatus, getMatchLabel } from '../../lib/utils';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

interface ItemCardProps {
  item: Item;
  pendingClaims?: number;
}

export default function ItemCard({ item, pendingClaims }: ItemCardProps) {
  const imageUrl = getImageUrl(item.images?.[0]);
  const displayStatus = getDisplayStatus(item, pendingClaims ?? item.pendingClaims ?? 0);
  const match = getMatchLabel(item.matchScore);

  return (
    <Link to={`/items/${item._id}`} className="group block h-full">
      <Card hover className="!p-0 overflow-hidden h-full flex flex-col !bg-surface-raised/80 border-border-subtle">
        <div className="relative aspect-[4/3] bg-surface-overlay overflow-hidden flex items-center justify-center p-2.5">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title}
              className="max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-[11px] tracking-[0.12em] uppercase">
              No photo
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface/50 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            <Badge className={`${TYPE_COLORS[item.type]} text-[10px] px-2 py-0.5`}>
              {capitalize(item.type)}
            </Badge>
            <Badge className={`${STATUS_COLORS[displayStatus.key] || STATUS_COLORS.active} text-[10px] px-2 py-0.5`}>
              {displayStatus.label}
            </Badge>
          </div>
          {match && item.matchScore !== undefined && (
            <div className="absolute top-2 right-2">
              <Badge className={`${match.className} text-[10px] px-2 py-0.5 backdrop-blur-sm`}>
                {match.tier} · {item.matchScore}%
              </Badge>
            </div>
          )}
        </div>

        <div className="p-3.5 flex-1 flex flex-col gap-2">
          <div>
            <h3 className="font-display text-[15px] font-semibold text-text-primary line-clamp-1 mb-0.5 capitalize tracking-tight">
              {item.title}
            </h3>
            <p className="text-[13px] text-text-secondary line-clamp-2 leading-snug">{item.description}</p>
          </div>

          <div className="mt-auto space-y-1 text-[11px] text-text-muted">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-accent/70 shrink-0" />
              <span className="truncate">{item.location.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-accent/70 shrink-0" />
              {formatDate(item.dateLostFound)}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 pt-0.5">
            <Badge className="bg-surface-overlay text-text-secondary border-border text-[10px] px-2 py-0.5">
              {capitalize(item.category)}
            </Badge>
            {item.color && (
              <Badge className="bg-surface-overlay text-text-secondary border-border text-[10px] px-2 py-0.5">
                {item.color}
              </Badge>
            )}
            {item.brand && (
              <Badge className="bg-surface-overlay text-text-secondary border-border text-[10px] px-2 py-0.5">
                {item.brand}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
