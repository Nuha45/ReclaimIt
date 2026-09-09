import { Link } from 'react-router-dom';
import { Search, PlusCircle, Shield, Zap, Users, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';

export default function HomePage() {
  const features = [
    { icon: Search, title: 'Smart Search', desc: 'Filter by category, location, date, and status to find items fast.' },
    { icon: Zap, title: 'Smart Matching', desc: 'AI-powered suggestions connect lost items with found reports automatically.' },
    { icon: Users, title: 'Direct Messaging', desc: 'Chat securely with other students to verify and reclaim belongings.' },
    { icon: Shield, title: 'Campus Safe', desc: 'Verified student accounts with moderation and reporting tools.' },
  ];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
              Campus Lost & Found Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6">
              Lost something?{' '}
              <span className="text-accent">ReclaimIt.</span>
            </h1>
            <p className="text-lg text-text-secondary mb-10 max-w-xl leading-relaxed">
              The premium lost & found platform built for college campuses. Post items, discover matches,
              and reunite with your belongings — all in one place.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/browse">
                <Button size="lg">
                  Browse Items <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/post">
                <Button variant="outline" size="lg">
                  <PlusCircle className="w-5 h-5" /> Post an Item
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-12">Everything you need</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-6 rounded-2xl bg-surface-raised border border-border-subtle hover:border-border transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-3xl bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 p-10 lg:p-16 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-text-primary mb-4">Ready to get started?</h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Join your campus community and help reunite lost items with their owners.
          </p>
          <Link to="/signup">
            <Button size="lg">Create Free Account</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
