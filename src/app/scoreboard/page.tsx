import Scoreboard from '@/app/components/Scoreboard';

export default function ScoreboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <Scoreboard />
      </div>
    </main>
  );
}