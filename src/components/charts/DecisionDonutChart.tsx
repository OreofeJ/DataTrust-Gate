import React, { useState } from 'react';
import { DecisionDistribution } from '../../types/governance';

interface DecisionDonutChartProps {
  distribution: DecisionDistribution;
}

export const DecisionDonutChart: React.FC<DecisionDonutChartProps> = ({ distribution }) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const segments = [
    {
      key: 'approved',
      label: 'Approved',
      count: distribution.approved,
      pct: distribution.approvedPct,
      color: '#176252',
    },
    {
      key: 'denied',
      label: 'Denied',
      count: distribution.denied,
      pct: distribution.deniedPct,
      color: '#9E2A2B',
    },
    {
      key: 'review',
      label: 'Requiring Review',
      count: distribution.awaitingReview,
      pct: distribution.awaitingReviewPct,
      color: '#B4690E',
    },
  ];

  const radius = 64;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 flex flex-col justify-between h-full">
      <div className="pb-3 border-b border-[#E2E0D8]">
        <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
          Governance Decision Distribution
        </h3>
        <p className="text-xs text-[#647182] mt-0.5">
          Breakdown across approved, denied, and review-queue requests
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4 flex-1">
        <div className="relative w-44 h-44 shrink-0">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90" role="img" aria-label="Governance Decision Distribution Donut Chart">
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="#F0EFE9"
              strokeWidth={strokeWidth}
            />
            {distribution.total > 0 &&
              segments.map((seg) => {
                if (seg.count === 0) return null;
                const segLength = (seg.count / distribution.total) * circumference;
                const dashArray = `${segLength} ${circumference - segLength}`;
                const dashOffset = -cumulativeOffset;
                cumulativeOffset += segLength;
                const isHovered = hoveredKey === seg.key;

                return (
                  <circle
                    key={seg.key}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => setHoveredKey(seg.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                );
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono-tabular text-2xl font-semibold text-[#0F1C2E]">
              {hoveredKey
                ? segments.find((s) => s.key === hoveredKey)?.count ?? distribution.total
                : distribution.total}
            </span>
            <span className="text-[11px] text-[#647182]">
              {hoveredKey
                ? segments.find((s) => s.key === hoveredKey)?.label
                : 'Total Requests'}
            </span>
          </div>
        </div>

        <div className="w-full sm:w-auto flex-1 space-y-3 max-w-xs">
          {segments.map((seg) => (
            <div
              key={seg.key}
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`flex items-center justify-between px-3 py-2 rounded-md border transition-colors cursor-default ${
                hoveredKey === seg.key
                  ? 'bg-[#F7F6F2] border-[#C9C5B8]'
                  : 'bg-white border-[#E2E0D8]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-xs font-medium text-[#0F1C2E]">{seg.label}</span>
              </div>
              <div className="font-mono-tabular text-xs text-right">
                <span className="font-semibold text-[#0F1C2E]">{seg.count}</span>
                <span className="text-[#647182] ml-2">({seg.pct.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
