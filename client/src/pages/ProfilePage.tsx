import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Package, Settings, Bell, Trash2, Bookmark, History, Pencil, Inbox, Star, LogOut } from 'lucide-react';
import { authApi, claimsApi, itemsApi, reviewsApi, getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { ClaimRequest, Item, Notification, PendingReview, Review, SearchHistoryEntry } from '../types';
import {
  getInitials,
  formatRelativeTime,
  capitalize,
  getDisplayStatus,
  refUserId,
  refUserName,
  claimItemRef,
} from '../lib/utils';
import { STATUS_COLORS, TYPE_COLORS } from '../lib/constants';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ReviewForm from '../components/reviews/ReviewForm';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  studentId: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
type Tab = 'items' | 'claims' | 'reviews' | 'saved' | 'searches' | 'settings' | 'notifications';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const [tab, setTab] = useState<Tab>('items');
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [savedItems, setSavedItems] = useState<Item[]>([]);
  const [searches, setSearches] = useState<SearchHistoryEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', studentId: user?.studentId || '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

  useEffect(() => {
    Promise.all([
      itemsApi.getMyItems(),
      claimsApi.getAll(),
      authApi.getSavedItems(),
      authApi.getSearchHistory(),
      authApi.getNotifications(),
      user?._id ? reviewsApi.getForUser(user._id) : Promise.resolve({ data: { reviews: [] } }),
      reviewsApi.getPending().catch(() => ({ data: { pending: [] } })),
    ])
      .then(([itemsRes, claimsRes, savedRes, searchRes, notifRes, reviewsRes, pendingRes]) => {
        setMyItems(itemsRes.data.items);
        setClaims(claimsRes.data.claims);
        setSavedItems(savedRes.data.items);
        setSearches(searchRes.data.searches);
        setNotifications(notifRes.data.notifications);
        setMyReviews(reviewsRes.data.reviews ?? []);
        setPendingReviews(
          (pendingRes.data.pending ?? []).filter((entry) => entry.reviewee?._id && entry.claim?._id)
        );
      })
      .catch(() => {
        toast.error('Some profile data could not be loaded. Pull to refresh by reopening this page.');
      })
      .finally(() => setLoading(false));
  }, [user?._id]);

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await itemsApi.delete(id);
      setMyItems((prev) => prev.filter((i) => i._id !== id));
      toast.success('Item deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onSaveProfile = async (data: ProfileForm) => {
    setSaving(true);
    try {
      const res = await authApi.updateProfile(data);
      setUser(res.data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (data: ChangePasswordForm) => {
    setChangingPassword(true);
    try {
      const res = await authApi.changePassword(data);
      toast.success(res.data.message);
      resetPasswordForm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const openNotification = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await authApi.markNotificationRead(n._id);
        setNotifications((list) => list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      } catch {
        /* ignore */
      }
    }
  };

  const tabs = [
    { id: 'items' as Tab, label: 'My Items', icon: Package },
    { id: 'claims' as Tab, label: 'Claims & Reports', icon: Inbox },
    { id: 'reviews' as Tab, label: 'Reviews', icon: Star },
    { id: 'saved' as Tab, label: 'Saved', icon: Bookmark },
    { id: 'searches' as Tab, label: 'Searches', icon: History },
    { id: 'notifications' as Tab, label: 'Alerts', icon: Bell },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-xl font-bold text-accent">
          {getInitials(user?.name || 'U')}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">{user?.name}</h1>
          <p className="text-text-secondary">{user?.email}</p>
          {user?.studentId && <p className="text-xs text-text-muted mt-0.5">ID: {user.studentId}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {!!user?.averageRating && (
              <Badge className="bg-accent/15 text-accent border-accent/30">
                <Star className="w-3 h-3 mr-1 fill-accent" />
                {user.averageRating}
                {user.reviewCount ? ` · ${user.reviewCount} review${user.reviewCount === 1 ? '' : 's'}` : ''}
              </Badge>
            )}
            {user?.isRatingFlagged && (
              <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Low rating flag</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-8 bg-surface-raised border border-border-subtle rounded-xl p-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              tab === id ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : tab === 'items' ? (
        myItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items posted yet"
            description="Post your first lost or found item."
            action={
              <Link to="/post"><Button>Post an Item</Button></Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {myItems.map((item) => {
              const status = getDisplayStatus(item, item.pendingClaims || 0);
              return (
                <Card key={item._id} className="!p-4 flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0 basis-[min(100%,12rem)]">
                    <div className="flex flex-wrap gap-2 mb-1">
                      <Badge className={TYPE_COLORS[item.type]}>{capitalize(item.type)}</Badge>
                      <Badge className={STATUS_COLORS[status.key] || STATUS_COLORS.active}>{status.label}</Badge>
                    </div>
                    <Link to={`/items/${item._id}`} className="font-medium text-text-primary hover:text-accent transition-colors">
                      {item.title}
                    </Link>
                    <p className="text-sm text-text-muted mt-0.5">{item.location.name}</p>
                  </div>
                  <Link to={`/items/${item._id}/edit`}>
                    <Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item._id)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </Card>
              );
            })}
          </div>
        )
      ) : tab === 'claims' ? (
        claims.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No claims or found reports yet"
            description="Claims on found items and found reports on lost items appear here. Accept/reject happens on the item page; chat opens after accept."
          />
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => {
              const { id: itemId, title: itemTitle, type: itemType } = claimItemRef(
                claim.item as Item | string | null
              );
              const isLost = itemType === 'lost';
              const ownerId = refUserId(claim.owner);
              const claimerId = refUserId(claim.claimer);
              const isOwner = ownerId != null && ownerId === user?._id;
              const chatUserId = isOwner ? claimerId : ownerId;
              return (
                <Card key={claim._id} className="!p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-muted mb-1">
                        {isOwner
                          ? isLost
                            ? 'Incoming found report'
                            : 'Incoming claim'
                          : isLost
                            ? 'Your found report'
                            : 'Your claim'}
                      </p>
                      {itemId ? (
                        <Link to={`/items/${itemId}`} className="font-medium text-text-primary hover:text-accent break-words">
                          {itemTitle}
                        </Link>
                      ) : (
                        <p className="font-medium text-text-secondary break-words">{itemTitle}</p>
                      )}
                      <p className="text-sm text-text-secondary mt-1">
                        {isOwner
                          ? `From ${refUserName(claim.claimer)}`
                          : `To ${refUserName(claim.owner)}`}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[claim.status] || STATUS_COLORS.pending}>
                      {capitalize(claim.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-3">
                    {claim.status === 'pending' && isOwner && 'Open the item to accept or decline.'}
                    {claim.status === 'pending' && !isOwner && 'Waiting on the poster — watch the notification bell.'}
                    {claim.status === 'accepted' && chatUserId && (
                      <Link
                        className="text-accent break-words"
                        to={`/chat?user=${chatUserId}${itemId ? `&item=${itemId}` : ''}`}
                      >
                        Open chat to coordinate return →
                      </Link>
                    )}
                    {claim.status === 'rejected' && 'This request was declined.'}
                    {claim.status === 'completed' && 'Return marked complete.'}
                  </p>
                </Card>
              );
            })}
          </div>
        )
      ) : tab === 'reviews' ? (
        <div className="space-y-8">
          {pendingReviews.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display font-semibold text-text-primary">Pending reviews</h2>
              {pendingReviews.map(({ claim, reviewee }) => {
                if (!reviewee?._id) return null;
                return (
                <ReviewForm
                  key={claim._id}
                  claimRequestId={claim._id}
                  reviewee={reviewee}
                  onSubmitted={() => {
                    setPendingReviews((list) => list.filter((entry) => entry.claim._id !== claim._id));
                    authApi.getMe().then(({ data }) => setUser(data.user)).catch(() => {});
                    if (user?._id) {
                      reviewsApi.getForUser(user._id).then(({ data }) => setMyReviews(data.reviews)).catch(() => {});
                    }
                  }}
                />
              );
              })}
            </div>
          )}
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-text-primary">Reviews about you</h2>
            {myReviews.length === 0 ? (
              <EmptyState icon={Star} title="No reviews yet" description="After a completed return, the other person can rate you." />
            ) : (
              myReviews.map((review) => (
                <Card key={review._id} className="!p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <p className="font-medium text-text-primary text-sm">{refUserName(review.reviewer, 'Someone')}</p>
                    <Badge className="bg-accent/15 text-accent border-accent/30">
                      <Star className="w-3 h-3 mr-1 fill-accent" /> {review.rating}/5
                    </Badge>
                  </div>
                  {review.comment && <p className="text-sm text-text-secondary">{review.comment}</p>}
                  <p className="text-xs text-text-muted mt-2">{formatRelativeTime(review.createdAt)}</p>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : tab === 'saved' ? (
        savedItems.length === 0 ? (
          <EmptyState icon={Bookmark} title="No saved items" description="Save interesting items to revisit them later." />
        ) : (
          <div className="space-y-4">
            {savedItems.map((item) => (
              <Card key={item._id} className="!p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link to={`/items/${item._id}`} className="font-medium text-text-primary hover:text-accent transition-colors">
                    {item.title}
                  </Link>
                  <p className="text-sm text-text-muted mt-0.5">{item.location.name}</p>
                </div>
                <Badge className={TYPE_COLORS[item.type]}>{capitalize(item.type)}</Badge>
              </Card>
            ))}
          </div>
        )
      ) : tab === 'searches' ? (
        searches.length === 0 ? (
          <EmptyState icon={History} title="No search history" description="Your recent filtered searches will appear here." />
        ) : (
          <div className="space-y-3">
            {searches.map((entry, index) => (
              <Card key={`${entry.query}-${index}`} className="!p-4">
                <p className="font-medium text-text-primary text-sm">{entry.query || 'Filtered search'}</p>
                <p className="text-xs text-text-muted mt-2">{formatRelativeTime(entry.createdAt)}</p>
              </Card>
            ))}
          </div>
        )
      ) : tab === 'notifications' ? (
        notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="Claim requests, accepts, rejects, and matches show up here and in the nav bell." />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Link
                key={n._id}
                to={
                  n.type === 'new_message' || n.type === 'claim_verified'
                    ? `/chat${n.relatedUser?._id ? `?user=${n.relatedUser._id}${n.relatedItem?._id ? `&item=${n.relatedItem._id}` : ''}` : ''}`
                    : n.relatedItem?._id
                      ? `/items/${n.relatedItem._id}`
                      : '/profile'
                }
                onClick={() => openNotification(n)}
              >
                <Card className={`!p-4 ${!n.isRead ? 'border-accent/30' : ''}`}>
                  <p className="font-medium text-text-primary text-sm">{n.title}</p>
                  <p className="text-sm text-text-secondary mt-1">{n.message}</p>
                  <p className="text-xs text-text-muted mt-2">{formatRelativeTime(n.createdAt)}</p>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-lg font-semibold text-text-primary mb-1">Profile information</h2>
            <p className="text-sm text-text-muted mb-5">Update how your name appears on posts and messages.</p>
            <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-5">
              <Input label="Full Name" error={errors.name?.message} {...register('name')} />
              <Input label="Student ID" placeholder="Optional" error={errors.studentId?.message} {...register('studentId')} />
              <Input label="Email" value={user?.email || ''} disabled className="opacity-60" hint="Email cannot be changed here." />
              <Button type="submit" loading={saving}>Save profile</Button>
            </form>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-text-primary mb-1">Change password</h2>
            <p className="text-sm text-text-muted mb-5">Use a strong password you don&apos;t use elsewhere.</p>
            <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-5">
              <PasswordInput
                label="Current password"
                autoComplete="current-password"
                error={passwordErrors.currentPassword?.message}
                {...registerPassword('currentPassword')}
              />
              <PasswordInput
                label="New password"
                autoComplete="new-password"
                error={passwordErrors.newPassword?.message}
                {...registerPassword('newPassword')}
              />
              <PasswordInput
                label="Confirm new password"
                autoComplete="new-password"
                error={passwordErrors.confirmPassword?.message}
                {...registerPassword('confirmPassword')}
              />
              <Button type="submit" loading={changingPassword}>Update password</Button>
            </form>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-text-primary mb-1">Account</h2>
            <p className="text-sm text-text-secondary mb-4">
              Signed in as <span className="text-text-primary font-medium">{user?.email}</span>
              {user?.role === 'admin' && (
                <span className="ml-2 text-xs text-accent">(Admin)</span>
              )}
            </p>
            <Button variant="outline" onClick={logout}>
              <LogOut className="w-4 h-4" /> Log out
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
