import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MapPin, Calendar, User, MessageCircle, Flag, CheckCircle,
  ChevronLeft, Zap, Bookmark, ShieldCheck, Star, Pencil, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, claimsApi, itemsApi, violationsApi, getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { ClaimRequest, Item } from '../types';
import { TYPE_COLORS, STATUS_COLORS, VIOLATION_REASONS } from '../lib/constants';
import { formatDate, getImageUrl, capitalize, getInitials, getDisplayStatus, getMatchLabel } from '../lib/utils';
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
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [pendingClaims, setPendingClaims] = useState(0);
  const [myClaim, setMyClaim] = useState<ClaimRequest | null>(null);
  const [matches, setMatches] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [claimerMessage, setClaimerMessage] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const refresh = async () => {
    if (!id) return;
    const [itemRes, matchRes] = await Promise.all([
      itemsApi.getById(id),
      itemsApi.getMatches(id),
    ]);
    setItem(itemRes.data.item);
    setMatches(matchRes.data.matches);
    setClaims(itemRes.data.claimRequests || []);
    setPendingClaims(itemRes.data.pendingClaims || 0);
    setMyClaim(itemRes.data.myClaim || null);
    if (isAuthenticated) {
      const savedRes = await authApi.getSavedItems();
      setSaved(savedRes.data.items.some((savedItem) => savedItem._id === itemRes.data.item._id));
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    refresh()
      .catch(() => navigate('/browse'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated, navigate]);

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
  const visibleClaimQuestions = item.verificationQuestions || [];
  const displayStatus = getDisplayStatus(item, pendingClaims);
  const canClaim =
    !isOwner &&
    !item.claimedBy &&
    !['claimed', 'resolved', 'removed'].includes(displayStatus.key) &&
    !myClaim &&
    item.status !== 'resolved' &&
    item.status !== 'removed';

  const handleClaim = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setActionLoading(true);
    try {
      const payload = {
        claimerMessage,
        verificationAnswers: visibleClaimQuestions.map((question) => ({
          questionId: question._id,
          answer: answers[question._id] || '',
        })),
      };
      await itemsApi.claim(id!, payload);
      await refresh();
      setClaimOpen(false);
      toast.success('Claim request sent! Watch the bell for the owner’s reply.');
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
      toast.success('Item marked as returned');
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

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await authApi.toggleSavedItem(item._id);
      setSaved(data.isSaved);
      toast.success(data.isSaved ? 'Saved for later' : 'Removed from saved items');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleClaimReview = async (claimId: string, status: 'accepted' | 'rejected' | 'completed') => {
    setActionLoading(true);
    try {
      const { data } = await claimsApi.review(claimId, { status });
      await refresh();
      if (status === 'accepted') {
        toast.success('Claim accepted — opening chat');
        navigate(`/chat?user=${data.claim.claimer._id}&item=${item._id}`);
      } else if (status === 'rejected') {
        toast.success('Claim rejected — item stays available');
      } else {
        toast.success('Marked as returned');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to browse
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-8 lg:gap-10">
        {/* Compact gallery */}
        <div className="space-y-3 lg:sticky lg:top-24 self-start">
          <div className="h-56 sm:h-64 w-full max-w-sm rounded-2xl overflow-hidden bg-surface-overlay/80 border border-border-subtle flex items-center justify-center p-3">
            {getImageUrl(images[activeImage] as string) ? (
              <img
                src={getImageUrl(images[activeImage] as string)!}
                alt={item.title}
                className="max-h-full max-w-full w-auto h-auto object-contain"
              />
            ) : (
              <div className="text-text-muted text-sm">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-sm">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 cursor-pointer transition-colors bg-surface-overlay flex items-center justify-center p-1 ${
                    activeImage === i ? 'border-accent' : 'border-border'
                  }`}
                >
                  {img ? (
                    <img src={getImageUrl(img)!} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-surface-overlay" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className={TYPE_COLORS[item.type]}>{capitalize(item.type)}</Badge>
              <Badge className={STATUS_COLORS[displayStatus.key] || STATUS_COLORS.active}>
                {displayStatus.label}
              </Badge>
              <Badge className="bg-surface-overlay text-text-secondary border-border">
                {capitalize(item.category)}
              </Badge>
              {item.condition && (
                <Badge className="bg-surface-overlay text-text-secondary border-border">
                  {capitalize(item.condition)}
                </Badge>
              )}
            </div>
            <h1 className="font-display text-3xl font-semibold text-text-primary mb-2 tracking-tight capitalize">
              {item.title}
            </h1>
            <p className="text-text-secondary leading-relaxed text-[15px]">{item.description}</p>
          </div>

          {myClaim && !isOwner && (
            <div className="rounded-2xl border border-accent/25 bg-accent/8 px-4 py-3.5 flex gap-3">
              <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {myClaim.status === 'pending' && 'Your claim is waiting for the poster'}
                  {myClaim.status === 'accepted' && 'Your claim was accepted — open Messages to coordinate'}
                  {myClaim.status === 'rejected' && 'Your claim was declined'}
                  {myClaim.status === 'completed' && 'This return is marked complete'}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Updates also appear in the notification bell and under Profile → Notifications.
                  {myClaim.status === 'accepted' && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="text-accent underline cursor-pointer"
                        onClick={() => navigate(`/chat?user=${item.postedBy._id}&item=${item._id}`)}
                      >
                        Open chat
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {isOwner && pendingClaims > 0 && (
            <div className="rounded-2xl border border-accent/25 bg-accent/8 px-4 py-3.5 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {pendingClaims} claim request{pendingClaims > 1 ? 's' : ''} waiting for you
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Review answers below. The item stays Available until you accept someone.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-3 text-text-secondary">
              <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
              <span>{item.location.name}{item.location.building ? ` — ${item.location.building}` : ''}</span>
            </div>
            <div className="flex items-center gap-3 text-text-secondary">
              <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
              <span>{formatDate(item.dateLostFound)}</span>
            </div>
            {(item.color || item.brand || item.size) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {item.color && <Badge className="bg-surface-overlay text-text-secondary border-border">Color: {item.color}</Badge>}
                {item.brand && <Badge className="bg-surface-overlay text-text-secondary border-border">Brand: {item.brand}</Badge>}
                {item.size && <Badge className="bg-surface-overlay text-text-secondary border-border">Size: {item.size}</Badge>}
              </div>
            )}
            <div className="flex items-center gap-3 text-text-secondary pt-1">
              <User className="w-4 h-4 text-accent flex-shrink-0" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                  {getInitials(item.postedBy.name)}
                </div>
                <span>{item.postedBy.name}</span>
                {!!item.postedBy.averageRating && (
                  <Badge className="bg-accent/15 text-accent border-accent/30">
                    <Star className="w-3 h-3 mr-1" /> {item.postedBy.averageRating}
                  </Badge>
                )}
              </div>
            </div>
            {item.uniqueMarks && (
              <div className="rounded-xl bg-surface-raised border border-border-subtle p-3.5 mt-2">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">Unique characteristics</p>
                <p className="text-sm text-text-secondary">{item.uniqueMarks}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {isOwner && (
              <Link to={`/items/${item._id}/edit`}>
                <Button variant="outline">
                  <Pencil className="w-4 h-4" /> Edit Post
                </Button>
              </Link>
            )}
            {canClaim && (
              <Button onClick={() => setClaimOpen(true)} loading={actionLoading}>
                <CheckCircle className="w-4 h-4" /> Request Claim
              </Button>
            )}
            {!isOwner && (
              <Button variant="secondary" onClick={handleMessage}>
                <MessageCircle className="w-4 h-4" /> Message Poster
              </Button>
            )}
            <Button variant="outline" onClick={handleToggleSave}>
              <Bookmark className="w-4 h-4" /> {saved ? 'Saved' : 'Save'}
            </Button>
            {isOwner && displayStatus.key === 'claimed' && (
              <Button onClick={handleResolve} loading={actionLoading}>
                <CheckCircle className="w-4 h-4" /> Mark Returned
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

      {isOwner && (
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <h2 className="font-display text-xl font-semibold text-text-primary">Claim Requests</h2>
            <Badge className="bg-accent/15 text-accent border-accent/30">{claims.length}</Badge>
          </div>
          <div className="space-y-4">
            {claims.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm text-text-muted text-center">
                No claim requests yet. When someone claims, you’ll get a notification here and in the bell.
              </div>
            ) : (
              claims.map((claim) => (
                <div key={claim._id} className="rounded-2xl bg-surface-raised border border-border-subtle p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="font-medium text-text-primary">{claim.claimer.name}</p>
                      <p className="text-sm text-text-muted">
                        Verification score: {claim.verificationScore}/{claim.verificationAnswers.length || 0}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[claim.status] || 'bg-surface-overlay text-text-secondary border-border'}>
                      {capitalize(claim.status)}
                    </Badge>
                  </div>
                  {claim.claimerMessage && (
                    <p className="text-sm text-text-secondary mb-4">{claim.claimerMessage}</p>
                  )}
                  <div className="space-y-2">
                    {claim.verificationAnswers.map((answer) => (
                      <div key={answer.questionId} className="rounded-xl bg-surface-overlay border border-border p-3">
                        <p className="text-sm font-medium text-text-primary">{answer.question}</p>
                        <p className="text-sm text-text-secondary mt-1">Answer: {answer.answer || 'No answer'}</p>
                      </div>
                    ))}
                  </div>
                  {claim.status === 'pending' && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      <Button loading={actionLoading} onClick={() => handleClaimReview(claim._id, 'accepted')}>
                        Accept Claim
                      </Button>
                      <Button variant="secondary" loading={actionLoading} onClick={() => handleClaimReview(claim._id, 'rejected')}>
                        Reject
                      </Button>
                    </div>
                  )}
                  {claim.status === 'accepted' && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      <Button loading={actionLoading} onClick={() => handleClaimReview(claim._id, 'completed')}>
                        Mark Returned
                      </Button>
                      <Button variant="secondary" onClick={() => navigate(`/chat?user=${claim.claimer._id}&item=${item._id}`)}>
                        Open Chat
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {matches.length > 0 && (
        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              <h2 className="font-display text-xl font-semibold text-text-primary">Smart Match Suggestions</h2>
              <Badge className="bg-accent/15 text-accent border-accent/30">{matches.length}</Badge>
            </div>
            <p className="text-xs text-text-muted max-w-md">
              Scores use brand, color, location, and distinctive details — generic titles alone never show as a perfect match.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {matches.map((match) => {
              const label = getMatchLabel(match.matchScore);
              return (
                <div key={match._id} className="relative">
                  <ItemCard item={match} />
                  {label && (
                    <p className="sr-only">{label.tier} match {match.matchScore}%</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Modal
        isOpen={claimOpen}
        onClose={() => setClaimOpen(false)}
        title="Verify and request claim"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClaimOpen(false)}>Cancel</Button>
            <Button onClick={handleClaim} loading={actionLoading}>Send request</Button>
          </>
        }
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This sends a request to the poster. The item stays Available until they accept. You’ll get a notification when they respond — and a chat opens if they accept.
          </p>
          {visibleClaimQuestions.map((question) => (
            <div key={question._id}>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">{question.question}</label>
              <input
                value={answers[question._id] || ''}
                onChange={(e) => setAnswers((current) => ({ ...current, [question._id]: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface-overlay border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                placeholder="Your answer"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Message to owner</label>
            <textarea
              className="w-full px-4 py-2.5 bg-surface-overlay border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-[90px] resize-y"
              placeholder="Tell them why you believe this is yours."
              value={claimerMessage}
              onChange={(e) => setClaimerMessage(e.target.value)}
            />
          </div>
        </div>
      </Modal>

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
