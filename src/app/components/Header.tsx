'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="mb-8 flex items-center justify-between">
      <nav className="flex gap-4">
        <Link href="/" className="text-blue-600 hover:text-blue-800">Rankings</Link>
        <Link href="/teams" className="text-blue-600 hover:text-blue-800">Team Schedules</Link>
        <Link href="/scoreboard" className="text-blue-600 hover:text-blue-800">Scoreboard</Link>
      </nav>
      <Link href="/" className="font-varsity text-4xl text-white no-underline">
        JACHA
      </Link>
    </header>
  );
}
