import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[]) => Promise<void>;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOptionChange = (index: number, val: string) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Please provide a poll question.');
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError('Please provide at least 2 non-empty options.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreatePoll(question.trim(), cleanOptions);
      onClose();
      setQuestion('');
      setOptions(['', '']);
    } catch (err: any) {
      setError(err?.message || 'Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
          <div>
            <h2 className="text-sm font-semibold text-white">Create Group Poll</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Ask a question for both AI personas and human participants to vote on.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded bg-neutral-950 border border-red-900 text-red-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-neutral-300 mb-1">
              Poll Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Should advanced AI development be open-source?"
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              autoFocus
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-medium text-neutral-300">
                Poll Options (min 2, max 6)
              </label>
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-[11px] text-neutral-400 hover:text-white transition"
                >
                  + Add Option
                </button>
              )}
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-neutral-500 hover:text-white text-[11px] px-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium bg-white hover:bg-neutral-200 text-black rounded transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Open Poll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
