import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MapPin, Calendar, User, MessageCircle, Flag, CheckCircle,
  ChevronLeft, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { itemsApi, violationsApi, getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { Item } from '../types';
import { TYPE_COLORS, STATUS_COLORS, VIOLATION_REASONS } from '../lib/constants';
import { formatDate, getImageUrl, capitalize, getInitials } from '../lib/utils';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import ItemCard from '../components/items/ItemCard';

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [item, setItem] = useState<Item | null>(null);
  const [matches, setMatches] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      itemsApi.getById(id),
      itemsApi.getMatches(id),
    ])
      .then(([itemRes, matchRes]) => {
        setItem(itemRes.data.item);
        setMatches(matchRes.data.matches);
      })
      .catch(() => navigate('/browse'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!item) return null;

  const isOwner = user?._id === item.postedBy._id;
  const images = item.images?.length ? item.images : [null];

  const handleClaim = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setActionLoading(true);
    try {
      const { data } = await itemsApi.claim(id!);
      setItem(data.item);
      toast.success('Claim submitted! The poster has been notified.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    setActionLoading(true);
    try {
      const { data } = await itemsApi.resolve(id!);
      setItem(data.item);
      toast.success('Item marked as resolved!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    navigate(`/chat?user=${item.postedBy._id}&item=${item._id}`);
  };

  const handleReport = async () => {
    if (!reportReason) { toast.error('Please select a reason'); return; }
    setActionLoading(true);
    try {
      await violationsApi.report({
        reportedUserId: item.postedBy._id,
        itemId: item._id,
        reason: reportReason,
        description: reportDesc,
      });
      toast.success('Report submitted. An admin will review it.');
      setReportOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to browse
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Images */}
        <div>
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-surface-overlay border border-border-subtle mb-3">
            {getImageUrl(images[activeImage] as string) ? (
              <img
                src={getImageUrl(images[activeImage] as string)!}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">No image available</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 cursor-pointer transition-colors ${
                    activeImage === i ? 'border-accent' : 'border-border'
                  }`}
                >
                  {img ? (
                    <img src={getImageUrl(img)!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface-overlay" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className={TYPE_COLORS[item.type]}>{capitalize(item.type)}</Badge>
              <Badge className={STATUS_COLORS[item.status]}>{capitalize(item.status)}</Badge>
              <Badge className="bg-surface-overlay text-text-secondary border-border">
                {capitalize(item.category)}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-3">{item.title}</h1>
            <p className="text-text-secondary leading-relaxed">{item.description}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-text-secondary">
              <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
              <span>{item.location.name}{item.location.building ? ` — ${item.location.building}` : ''}</span>
            </div>
            <div className="flex items-center gap-3 text-text-secondary">
              <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
              <span>{formatDate(item.dateLostFound)}</span>
            </div>
            <div className="flex items-center gap-3 text-text-secondary">
              <User className="w-4 h-4 text-accent flex-shrink-0" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                  {getInitials(item.postedBy.name)}
                </div>
                <span>{item.postedBy.name}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {!isOwner && item.status === 'active' && (
              <Button onClick={handleClaim} loading={actionLoading}>
                <CheckCircle className="w-4 h-4" /> Claim Item
              </Button>
            )}
            {!isOwner && (
              <Button variant="secondary" onClick={handleMessage}>
                <MessageCircle className="w-4 h-4" /> Message Poster
              </Button>
            )}
            {isOwner && item.status === 'claimed' && (
              <Button onClick={handleResolve} loading={actionLoading}>
                <CheckCircle className="w-4 h-4" /> Mark Resolved
              </Button>
            )}
            {!isOwner && (
              <Button variant="ghost" onClick={() => setReportOpen(true)}>
                <Flag className="w-4 h-4" /> Report
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Smart Matches */}
      {matches.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-text-primary">Smart Match Suggestions</h2>
            <Badge className="bg-accent/15 text-accent border-accent/30">{matches.length} found</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {matches.map((match) => (
              <ItemCard key={match._id} item={match} />
            ))}
          </div>
        </section>
      )}

      <Modal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report Item"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReport} loading={actionLoading}>Submit Report</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Reason"
            placeholder="Select a reason"
            options={VIOLATION_REASONS}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Details (optional)</label>
            <textarea
              className="w-full px-4 py-2.5 bg-surface-overlay border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-[80px] resize-y"
              placeholder="Provide additional context..."
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
