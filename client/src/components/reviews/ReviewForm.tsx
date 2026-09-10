import { useState } from 'react';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { reviewsApi, getErrorMessage } from '../../lib/api';
import type { User } from '../../types';
import Button from '../ui/Button';

interface ReviewFormProps {
  claimRequestId: string;
  reviewee: User;
  onSubmitted?: () => void;
}

export default function ReviewForm({ claimRequestId, reviewee, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await reviewsApi.create({
        revieweeId: reviewee._id,
        rating,
        comment,
        claimRequestId,
      });
      toast.success('Review submitted — thank you!');
      onSubmitted?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5 space-y-4">
      <div>
        <h3 className="font-display font-semibold text-text-primary">Rate {reviewee.name}</h3>
        <p className="text-sm text-text-secondary mt-1">
          How was this campus handoff? Honest ratings keep ReclaimIt trustworthy.
        </p>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className="p-1 cursor-pointer"
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(value)}
            aria-label={`${value} star${value > 1 ? 's' : ''}`}
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                value <= (hover || rating) ? 'fill-accent text-accent' : 'text-text-muted'
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        className="w-full px-4 py-2.5 bg-surface-overlay border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-[90px] resize-y"
        placeholder="Optional comment (was the meetup smooth? item as described?)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
      />

      <Button onClick={submit} loading={loading}>
        Submit review
      </Button>
    </div>
  );
}
