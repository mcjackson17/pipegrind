"use client";

import { Campaign, DayOfWeek, DAY_LABELS } from "@/lib/types";
import { getDayProgress } from "@/lib/storage";

interface WeeklyChartProps {
  campaign: Campaign;
}

export function WeeklyChart({ campaign }: WeeklyChartProps) {
  const days: DayOfWeek[] = [0, 1, 2, 3, 4];
  const progress = days.map((day) => getDayProgress(campaign, day));
  const maxTotal = Math.max(...progress.map((p) => p.total), 1);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6">
      <h3 className="text-sm font-medium text-zinc-600 mb-4">Weekly Progress</h3>
      <div className="flex items-end gap-3 h-40">
        {days.map((day, i) => {
          const p = progress[i];
          const heightPercent = (p.total / maxTotal) * 100;
          const donePercent = p.total > 0 ? (p.done / p.total) * 100 : 0;
          const jsDay = new Date().getDay();
          const todayIndex = jsDay >= 1 && jsDay <= 5 ? jsDay - 1 : -1;
          const isToday = day === todayIndex;

          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md relative overflow-hidden bg-zinc-100"
                style={{ height: `${heightPercent}%`, minHeight: "8px" }}
              >
                <div
                  className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${
                    isToday ? "bg-blue-500" : "bg-zinc-400"
                  }`}
                  style={{ height: `${donePercent}%` }}
                />
              </div>
              <span className={`text-xs ${isToday ? "font-bold text-blue-600" : "text-zinc-500"}`}>
                {DAY_LABELS[day].slice(0, 3)}
              </span>
              <span className="text-xs text-zinc-400">
                {p.done}/{p.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
