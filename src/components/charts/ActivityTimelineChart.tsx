import React, { useMemo, useState } from 'react';
import { AccessRequest } from '../../types/governance';
import { computeActivityTimeline } from '../../services/analytics';

interface ActivityTimelineChartProps {
  requests: AccessRequest[];
}

export const ActivityTimelineChart: React.FC<ActivityTimelineChartProps> = ({ requests }) => {
  const [granularity, setGranularity] = useState<'weekly' | 'daily'>('weekly');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const points = useMemo(
    () => computeActivityTimeline(requests, granularity),
    [requests, granularity],
  );

  const maxY = useMemo(() => {
    const m = Math.max(1, ...points.flatMap((p) => [p.submitted, p.evaluated]));
    return Math.ceil(m * 1.2);
  }, [points]);

  const width = 540;
  const height = 220;
  const padLeft = 36;
  const padRight = 18;
  const padTop = 16;
  const padBottom = 34;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const getX = (idx: number) => {
    if (points.length <= 1) return padLeft + chartW / 2;
    return padLeft + (idx / (points.length - 1)) * chartW;
  };

  const getY = (val: number) => padTop + chartH - (val / maxY) * chartH;

  const submittedPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.submitted).toFixed(1)}`)
    .join(' ');

  const evaluatedPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.evaluated).toFixed(1)}`)
    .join(' ');

  const gridSteps = 4;

  return (
    <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 flex flex-col justify-between h-full">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#E2E0D8]">
        <div>
          <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
            Access Activity Timeline
          </h3>
          <p className="text-xs text-[#647182] mt-0.5">
            Submitted vs evaluated requests calculated from stored Firestore timestamps
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F0EFE9] rounded-md">
          <button
            type="button"
            onClick={() => setGranularity('weekly')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              granularity === 'weekly'
                ? 'bg-white text-[#0F1C2E] shadow-xs'
                : 'text-[#647182] hover:text-[#0F1C2E]'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setGranularity('daily')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              granularity === 'daily'
                ? 'bg-white text-[#0F1C2E] shadow-xs'
                : 'text-[#647182] hover:text-[#0F1C2E]'
            }`}
          >
            Daily
          </button>
        </div>
      </div>

      <div className="pt-3 flex-1 flex flex-col justify-between">
        {points.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-[#647182]">
            No timestamped access requests recorded yet.
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto"
              role="img"
              aria-label="Access Activity Timeline Chart"
            >
              {/* Horizontal Grid */}
              {Array.from({ length: gridSteps + 1 }).map((_, idx) => {
                const val = Math.round((maxY / gridSteps) * idx);
                const y = getY(val);
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke="#ECEAE2"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="font-mono-tabular text-[10px] fill-[#647182]"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Submitted Line */}
              <path
                d={submittedPath}
                fill="none"
                stroke="#0F1C2E"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />

              {/* Evaluated Line */}
              <path
                d={evaluatedPath}
                fill="none"
                stroke="#1F6E72"
                strokeWidth="2.2"
                strokeDasharray="5 3"
                strokeLinejoin="round"
              />

              {/* Hover Vertical Line */}
              {hoveredIdx !== null && points[hoveredIdx] && (
                <line
                  x1={getX(hoveredIdx)}
                  y1={padTop}
                  x2={getX(hoveredIdx)}
                  y2={padTop + chartH}
                  stroke="#B4690E"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}

              {/* Data Points + X Labels */}
              {points.map((p, idx) => {
                const x = getX(idx);
                const showLabel =
                  points.length <= 7 || idx % 2 === 0 || idx === points.length - 1;
                return (
                  <g key={p.isoStart}>
                    <circle
                      cx={x}
                      cy={getY(p.submitted)}
                      r={hoveredIdx === idx ? 4.5 : 3}
                      fill="#0F1C2E"
                    />
                    <circle
                      cx={x}
                      cy={getY(p.evaluated)}
                      r={hoveredIdx === idx ? 4.5 : 3}
                      fill="#1F6E72"
                    />
                    {showLabel && (
                      <text
                        x={x}
                        y={height - 10}
                        textAnchor="middle"
                        className="font-mono-tabular text-[10px] fill-[#647182]"
                      >
                        {p.bucketLabel}
                      </text>
                    )}
                    <rect
                      x={x - 16}
                      y={padTop}
                      width="32"
                      height={chartH + 16}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {hoveredIdx !== null && points[hoveredIdx] && (
              <div className="mt-1 px-3 py-1.5 bg-[#F7F6F2] border border-[#E2E0D8] rounded text-xs flex items-center justify-between">
                <span className="font-medium text-[#0F1C2E]">
                  {granularity === 'weekly' ? 'Week of ' : ''}
                  {points[hoveredIdx].bucketLabel} ({points[hoveredIdx].isoStart})
                </span>
                <span className="font-mono-tabular text-[#0F1C2E]">
                  Submitted: <strong>{points[hoveredIdx].submitted}</strong> · Evaluated:{' '}
                  <strong className="text-[#1F6E72]">{points[hoveredIdx].evaluated}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-5 pt-3 border-t border-[#E2E0D8] text-xs text-[#3B495C]">
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-[#0F1C2E] inline-block" />
            <span>Submitted Requests</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-[#1F6E72] inline-block" />
            <span>Evaluated Decisions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
