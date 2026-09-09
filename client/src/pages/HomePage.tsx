import { Link } from 'react-router-dom';
import { Search, PlusCircle, Shield, Zap, MessageCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';

export default function HomePage() {
  const features = [
    { icon: Search, title: 'Campus browse', desc: 'Filter by color, brand, floor, and date with compact photo cards.' },
    { icon: Zap, title: 'Honest matching', desc: 'Suggestions need real signals — brand, marks, location — not generic titles.' },
    { icon: CheckCircle2, title: 'Verified claims', desc: 'Requests stay pending until the poster accepts. No premature “Claimed”.' },
    { icon: MessageCircle, title: 'Secure chat', desc: 'Accept a claim and chat opens automatically to coordinate the handoff.' },
    { icon: Shield, title: 'Campus safe', desc: 'Student accounts, reporting, and moderation keep the feed trustworthy.' },
  ];

  return (
    <div>
      <section className="relative overflow-hidden min-h-[78vh] flex items-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[380px] h-[280px] rounded-full bg-blue-500/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 w-full">
          <p className="font-display text-accent text-sm font-semibold tracking-[0.2em] uppercase mb-5">
            ReclaimIt
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-[1.05] mb-6 max-w-3xl tracking-tight">
            Lost on campus.<br />
            <span className="text-accent">Found with clarity.</span>
          </h1>
          <p className="text-lg text-text-secondary mb-10 max-w-xl leading-relaxed">
            Post with proof, claim with verification, and only mark Claimed when the founder says yes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/browse">
              <Button size="lg">
                Browse finds <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/post">
              <Button variant="outline" size="lg">
                <PlusCircle className="w-5 h-5" /> Post an item
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-display text-2xl font-semibold text-text-primary mb-8">Built for real handoffs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-5 rounded-2xl bg-surface-raised/80 border border-border-subtle hover:border-accent/25 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-text-primary mb-1.5">{title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
