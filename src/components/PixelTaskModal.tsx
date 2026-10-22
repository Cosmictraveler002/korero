import React from 'react';
import { X, CheckCircle2, Clock, FileText, CheckSquare } from 'lucide-react';
import { PixelTask } from '../types';

interface PixelTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: PixelTask | null;
  onClearTask?: () => void;
}

export const PixelTaskModal: React.FC<PixelTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onClearTask,
}) => {
  if (!isOpen || !task) return null;

  const isCompleted = task.status === 'completed';

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-emerald-900/60 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-850 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
              <FileText size={16} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-white">task.md</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-semibold ${
                    isCompleted
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                  }`}
                >
                  {isCompleted ? 'Completed' : 'In Progress'}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 truncate">
                Assigned by @{task.requested_by}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 bg-neutral-900 border-b border-neutral-850 text-[11px] flex items-center justify-between text-neutral-400">
          <div className="flex items-center gap-1.5">
            {isCompleted ? (
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
            ) : (
              <Clock size={13} className="text-amber-400 shrink-0 animate-spin" />
            )}
            <span>
              {isCompleted
                ? `Completed ${task.completed_at ? new Date(task.completed_at).toLocaleTimeString() : ''}`
                : 'Pixel is processing Python sandbox calculations...'}
            </span>
          </div>

          {onClearTask && (
            <button
              onClick={onClearTask}
              className="text-[10px] text-neutral-500 hover:text-red-400 transition underline"
            >
              Clear Task
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto font-mono text-xs text-neutral-200 space-y-3 leading-relaxed">
          <div className="p-3 rounded bg-black/60 border border-neutral-800 whitespace-pre-wrap font-mono text-emerald-300/90 selection:bg-emerald-900 selection:text-white">
            {task.markdown_content}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded transition"
          >
            Close task.md
          </button>
        </div>
      </div>
    </div>
  );
};
