import { Download, QrCode, Printer } from 'lucide-react';
import type { Item } from '../../types';
import { itemsApi } from '../../lib/api';
import { getImageUrl } from '../../lib/utils';
import Button from '../ui/Button';

interface LostItemQrPanelProps {
  item: Item;
}

export default function LostItemQrPanel({ item }: LostItemQrPanelProps) {
  const qrSrc = getImageUrl(item.qrCodeUrl) || itemsApi.getQrUrl(item._id);
  const flyerHref = itemsApi.getFlyerUrl(item._id);
  const qrHref = itemsApi.getQrUrl(item._id);

  return (
    <section className="mt-10 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 via-surface-raised to-surface-raised p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="shrink-0 mx-auto sm:mx-0">
          <div className="w-40 h-40 rounded-2xl bg-white p-2.5 shadow-lg shadow-black/30 border border-border-subtle">
            <img
              src={qrSrc}
              alt={`QR code for ${item.title}`}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-accent" />
            <h2 className="font-display text-lg font-semibold text-text-primary">Campus flyer QR</h2>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Print this QR and post it around campus. Anyone who scans it opens this listing on ReclaimIt
            and can claim the item or message you — even if they never heard of the app before.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <a href={flyerHref} download={`reclaimit-flyer-${item._id}.svg`}>
              <Button>
                <Printer className="w-4 h-4" /> Download flyer
              </Button>
            </a>
            <a href={qrHref} download={`reclaimit-qr-${item._id}.png`}>
              <Button variant="outline">
                <Download className="w-4 h-4" /> Download QR
              </Button>
            </a>
          </div>
          <p className="text-xs text-text-muted">
            Flyer is an SVG — open it and print, or print to PDF from your browser.
          </p>
        </div>
      </div>
    </section>
  );
}
