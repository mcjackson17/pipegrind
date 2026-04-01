"use client";

import { DayProgress } from "@/lib/types";

interface ProgressBarProps {
  progress: DayProgress;
  label?: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  const completed = progress.done + progress.skipped;
  const percent = progress.total > 0 ? Math.round((completed / progress.total) * 100) : 0;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-zinc-600">{label}</span>
          <span className="text-sm text-zinc-500">
            {progress.done} done{progress.skipped > 0 ? `, ${progress.skipped} skipped` : ""} / {progress.total}
          </span>
        </div>
      )}
      <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-blue-500 to-blue-600"
          style={{ width: `${percent}%` }}
        />
      </div>
      {percent === 100 && (
        <p className="text-sm text-green-600 font-medium mt-1">All done for today! 🎯</p>
      )}
    </div>
  );
}
