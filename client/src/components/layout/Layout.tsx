import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
      <footer className="border-t border-border-subtle py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-text-muted">
          © {new Date().getFullYear()} ReclaimIt — Helping campus communities reunite with lost belongings.
        </div>
      </footer>
    </div>
  );
}
