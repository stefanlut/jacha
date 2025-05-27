import { Poll } from '@/app/types';

interface PollSelectorProps {
  selectedPoll: Poll;
  onPollChange: (poll: Poll) => void;
}

const polls: Poll[] = [
  {
    id: 'd-i-mens-poll',
    name: "Men's Division I",
    url: 'https://json-b.uscho.com/json/rankings/d-i-mens-poll'
  },
  {
    id: 'd-i-womens-poll',
    name: "Women's Division I",
    url: 'https://json-b.uscho.com/json/rankings/d-i-womens-poll'
  }
];

export default function PollSelector({ selectedPoll, onPollChange }: PollSelectorProps) {
  return (
    <div className="flex gap-4 mb-6">
      {polls.map((poll) => (
        <button
          key={poll.id}
          onClick={() => onPollChange(poll)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedPoll.id === poll.id
              ? 'bg-blue-500 text-white'
              : 'bg-white/5 hover:bg-white/10 text-slate-300'
          }`}
        >
          {poll.name}
        </button>
      ))}
    </div>
  );
}
