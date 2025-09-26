import Scoreboard from '@/app/components/Scoreboard';

export default function ScoreboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">NCAA Hockey Scoreboard</h1>
          <p className="text-slate-300">Daily Scores and Game Information</p>
          <small className="text-slate-500">If any information is wrong, blame CHN.</small>
        </div>
        <Scoreboard />
      </div>
    </main>
  );
}