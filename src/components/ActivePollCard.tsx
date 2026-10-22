import React from 'react';
import { Poll } from '../types';

interface ActivePollCardProps {
  poll: Poll;
  currentUserName: string;
  onVote: (optionIndex: number) => void;
  onClosePoll?: () => void;
  canClose?: boolean;
}

export const ActivePollCard: React.FC<ActivePollCardProps> = ({
  poll,
  currentUserName,
  onVote,
  onClosePoll,
  canClose = true,
}) => {
  const totalVotes = Object.keys(poll.votes || {}).length;
  const userVoteIndex = poll.votes?.[currentUserName];
  const hasUserVoted = userVoteIndex !== undefined;

  // Calculate vote counts per option
  const counts = poll.options.map((_, idx) => {
    return Object.values(poll.votes || {}).filter((v) => v === idx).length;
  });

  return (
    <div className="my-3 p-3.5 bg-neutral-950 rounded border border-neutral-850 max-w-xl mx-auto w-full text-xs">
      <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-neutral-900">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mb-0.5">
            <span>Poll by {poll.created_by}</span>
            <span>·</span>
            <span className={poll.status === 'open' ? 'text-emerald-400' : 'text-neutral-500'}>
              {poll.status === 'open' ? 'Active' : 'Closed'}
            </span>
            <span>·</span>
            <span>{totalVotes} vote{totalVotes === 1 ? '' : 's'}</span>
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-white leading-snug">
            {poll.question}
          </h3>
        </div>

        {poll.status === 'open' && canClose && onClosePoll && (
          <button
            onClick={onClosePoll}
            className="text-[10px] text-neutral-400 hover:text-white px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 transition shrink-0"
          >
            End Poll
          </button>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((option, idx) => {
          const count = counts[idx] || 0;
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isUserVote = userVoteIndex === idx;

          // Voters for this option
          const votersForOption = Object.entries(poll.votes || {})
            .filter(([_, vIdx]) => vIdx === idx)
            .map(([voter]) => voter);

          return (
            <div key={idx} className="space-y-1">
              <button
                type="button"
                disabled={poll.status !== 'open'}
                onClick={() => onVote(idx)}
                className={`w-full relative overflow-hidden text-left p-2.5 rounded transition flex items-center justify-between gap-3 ${
                  isUserVote
                    ? 'bg-neutral-850 text-white font-medium'
                    : 'bg-neutral-900/60 hover:bg-neutral-900 text-neutral-200'
                } ${poll.status !== 'open' ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {/* Progress bar fill */}
                <div
                  className="absolute inset-0 bg-neutral-800/50 pointer-events-none transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />

                <div className="relative z-10 flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-neutral-400 font-mono">
                    [{idx + 1}]
                  </span>
                  <span className="truncate text-xs">{option}</span>
                  {isUserVote && (
                    <span className="text-[10px] text-emerald-400 font-medium">
                      (Your vote)
                    </span>
                  )}
                </div>

                <div className="relative z-10 flex items-center gap-2 shrink-0 text-[11px] font-mono">
                  <span className="text-neutral-400">{count}</span>
                  <span className="text-neutral-500 w-8 text-right">{percent}%</span>
                </div>
              </button>

              {/* Voters list */}
              {votersForOption.length > 0 && (
                <div className="text-[10px] text-neutral-500 pl-2 flex items-center gap-1 flex-wrap">
                  <span>Votes:</span>
                  <span className="text-neutral-400">{votersForOption.join(', ')}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {poll.status === 'open' && !hasUserVoted && (
        <p className="text-[10px] text-neutral-500 mt-2 text-center">
          Click an option above or type <code className="text-neutral-400 font-mono">/vote [number]</code> to cast your vote.
        </p>
      )}
    </div>
  );
};
