import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';
import {
  GOOD_DEED_CELEBRATIONS,
  type GoodDeedCelebrationKind,
} from '../../lib/goodDeedCelebration';

interface GoodDeedCelebrationProps {
  kind: GoodDeedCelebrationKind | null;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#ffb347', '#ffc266', '#ff9f1c', '#fde68a', '#34d399', '#fbbf24', '#f3f5fb'];

export default function GoodDeedCelebration({ kind, onClose }: GoodDeedCelebrationProps) {
  const open = Boolean(kind);
  const copy = kind ? GOOD_DEED_CELEBRATIONS[kind] : null;

  const confetti = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: 4 + Math.random() * 92,
        delay: Math.random() * 600,
        duration: 1400 + Math.random() * 900,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 3 + Math.random() * 5,
        drift: -32 + Math.random() * 64,
        round: i % 3 === 0,
      })),
    [kind]
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !copy) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="good-deed-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
        aria-label="Close celebration"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-md rounded-2xl overflow-hidden',
          'bg-surface-raised border border-border',
          'shadow-2xl shadow-black/50 ring-2 ring-accent/30',
          'animate-good-deed-pop',
          'shadow-[0_0_56px_-6px_rgba(255,179,71,0.45)]'
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(255,179,71,0.22),transparent_55%)]"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent/30 via-accent to-accent/30 animate-good-deed-shimmer"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
          {confetti.map((piece) => (
            <span
              key={piece.id}
              className={cn(
                'absolute animate-good-deed-confetti',
                piece.round ? 'rounded-full' : 'rounded-sm'
              )}
              style={{
                left: `${piece.left}%`,
                top: '-10%',
                width: piece.size,
                height: piece.round ? piece.size : piece.size * 1.35,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}ms`,
                animationDuration: `${piece.duration}ms`,
                ['--drift' as string]: `${piece.drift}px`,
              }}
            />
          ))}
        </div>

        <div className="relative px-6 sm:px-8 pt-8 pb-6 text-center">
          <div
            className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center border border-accent/40 bg-accent/15 shadow-lg shadow-accent/25 animate-good-deed-sparkle"
            aria-hidden
          >
            <Sparkles className="w-7 h-7 text-accent drop-shadow-[0_0_8px_rgba(255,179,71,0.6)]" strokeWidth={2} />
          </div>
          <h2
            id="good-deed-title"
            className="font-display text-xl sm:text-2xl font-bold leading-snug mb-3 text-text-primary tracking-tight"
          >
            {copy.title}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed mb-8 max-w-sm mx-auto text-text-secondary">
            {copy.message}
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-4 border-t border-border-subtle">
            <Button type="button" className="min-w-[10rem] shadow-lg shadow-accent/30" onClick={onClose}>
              Continue
            </Button>
            <Button type="button" variant="secondary" className="min-w-[10rem]" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
