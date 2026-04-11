"use client";

interface MonthData {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

interface PLChartProps {
  months: MonthData[];
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export function PLChart({ months }: PLChartProps) {
  if (months.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-zinc-400">
        No data yet
      </div>
    );
  }

  const WIDTH = 600;
  const HEIGHT = 200;
  const PADDING = { top: 20, right: 20, bottom: 36, left: 52 };
  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const maxIncome = Math.max(...months.map((m) => m.income), 0);
  const maxExpense = Math.max(...months.map((m) => m.expenses), 0);
  const maxNet = Math.max(...months.map((m) => Math.abs(m.net)), 0);
  const maxVal = Math.max(maxIncome, maxExpense, maxNet, 1);

  // Chart area: 0 in the middle-ish. We'll put 0 at 60% down to give more room for income.
  const zeroY = chartH * 0.65;
  const scaleUp = zeroY / maxVal;
  const scaleDown = (chartH - zeroY) / maxVal;

  const barWidth = (chartW / months.length) * 0.35;
  const groupWidth = chartW / months.length;

  function toY(value: number): number {
    if (value >= 0) return zeroY - value * scaleUp;
    return zeroY + Math.abs(value) * scaleDown;
  }

  function barProps(value: number): { y: number; height: number } {
    const y0 = zeroY;
    const y1 = toY(value);
    return { y: Math.min(y0, y1), height: Math.abs(y0 - y1) };
  }

  // Profit line points
  const profitPoints = months.map((m, i) => {
    const cx = PADDING.left + i * groupWidth + groupWidth / 2;
    const cy = PADDING.top + toY(m.net);
    return { cx, cy };
  });

  const polyline = profitPoints.map((p) => `${p.cx},${p.cy}`).join(" ");

  // Y axis labels
  const yTicks = [maxVal, maxVal / 2, 0, -maxVal / 2].filter((v) => Math.abs(v) < maxVal * 1.1);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ minWidth: Math.max(months.length * 60, 320) }}
      >
        {/* Y axis grid lines + labels */}
        {yTicks.map((tick) => {
          const y = PADDING.top + toY(tick);
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + chartW}
                y2={y}
                stroke={tick === 0 ? "#a1a1aa" : "#e4e4e7"}
                strokeWidth={tick === 0 ? 1.5 : 1}
              />
              <text
                x={PADDING.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="#71717a"
              >
                {tick < 0 ? `-${fmt(Math.abs(tick))}` : fmt(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {months.map((m, i) => {
          const groupX = PADDING.left + i * groupWidth;
          const incBar = barProps(m.income);
          const expBar = barProps(-m.expenses);

          return (
            <g key={m.label}>
              {/* Income bar — slate */}
              <rect
                x={groupX + groupWidth / 2 - barWidth - 1}
                y={PADDING.top + incBar.y}
                width={barWidth}
                height={incBar.height}
                fill="#475569"
                rx={2}
              />
              {/* Expense bar — light gray (goes down) */}
              <rect
                x={groupX + groupWidth / 2 + 1}
                y={PADDING.top + expBar.y}
                width={barWidth}
                height={expBar.height}
                fill="#cbd5e1"
                rx={2}
              />
              {/* X label */}
              <text
                x={groupX + groupWidth / 2}
                y={PADDING.top + chartH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#71717a"
              >
                {m.label}
              </text>
            </g>
          );
        })}

        {/* Profit line */}
        {profitPoints.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}
        {/* Profit dots */}
        {profitPoints.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={4} fill="#f59e0b" stroke="white" strokeWidth={1.5} />
        ))}

        {/* Legend */}
        <g transform={`translate(${PADDING.left + chartW - 140}, ${PADDING.top - 4})`}>
          <rect x={0} y={0} width={10} height={10} fill="#f59e0b" rx={2} />
          <text x={14} y={9} fontSize={9} fill="#71717a">Profit</text>
          <rect x={48} y={0} width={10} height={10} fill="#475569" rx={2} />
          <text x={62} y={9} fontSize={9} fill="#71717a">Revenue</text>
          <rect x={106} y={0} width={10} height={10} fill="#cbd5e1" rx={2} />
          <text x={120} y={9} fontSize={9} fill="#71717a">Expense</text>
        </g>
      </svg>
    </div>
  );
}
