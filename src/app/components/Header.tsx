'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
  const base = 'px-3 py-2 rounded-md text-sm font-medium transition-colors';
  const active = 'bg-white/20 text-white';
  const idle = 'text-slate-300 hover:text-white';
  return (
    <Link href={href} className={`${base} ${isActive ? active : idle}`}>
      {children}
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-varsity text-3xl text-white no-underline tracking-wider">
          JACHA
        </Link>
        <nav className="hidden md:flex items-center gap-2">
          <NavLink href="/">Rankings</NavLink>
          <NavLink href="/teams">Team Schedules</NavLink>
          <NavLink href="/scoreboard">Scoreboard</NavLink>
        </nav>
      </div>

      {/* Mobile menu button */}
      <button
        aria-label="Toggle navigation menu"
        className="md:hidden text-slate-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 rounded p-2"
        onClick={() => setOpen(!open)}
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" />
          )}
        </svg>
      </button>

      {/* Mobile menu panel */}
      {open && (
        <div className="absolute left-0 right-0 top-16 z-50 md:hidden bg-slate-800/95 backdrop-blur border-b border-white/10">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-2">
            <NavLink href="/" >Rankings</NavLink>
            <NavLink href="/teams">Team Schedules</NavLink>
            <NavLink href="/scoreboard">Scoreboard</NavLink>
          </div>
        </div>
      )}
    </header>
  );
}
