import React, { useMemo, useState } from 'react';
import { StateActivityMetric } from '../../types/governance';

interface NigeriaActivityMapProps {
  metrics: StateActivityMetric[];
}

interface StateNodeLayout {
  state: string;
  code: string;
  x: number;
  y: number;
  zone: string;
}

const STATE_LAYOUT: StateNodeLayout[] = [
  { state: 'Sokoto', code: 'SK', x: 146, y: 74, zone: 'North West' },
  { state: 'Kano', code: 'KN', x: 270, y: 108, zone: 'North West' },
  { state: 'Borno', code: 'BO', x: 434, y: 112, zone: 'North East' },
  { state: 'Kaduna', code: 'KD', x: 230, y: 160, zone: 'North West' },
  { state: 'Plateau', code: 'PL', x: 290, y: 204, zone: 'North Central' },
  { state: 'FCT Abuja', code: 'FC', x: 232, y: 214, zone: 'North Central' },
  { state: 'Oyo', code: 'OY', x: 108, y: 240, zone: 'South West' },
  { state: 'Ogun', code: 'OG', x: 84, y: 276, zone: 'South West' },
  { state: 'Lagos', code: 'LA', x: 96, y: 312, zone: 'South West' },
  { state: 'Edo', code: 'ED', x: 164, y: 296, zone: 'South South' },
  { state: 'Delta', code: 'DE', x: 170, y: 338, zone: 'South South' },
  { state: 'Anambra', code: 'AN', x: 214, y: 318, zone: 'South East' },
  { state: 'Enugu', code: 'EN', x: 246, y: 294, zone: 'South East' },
  { state: 'Rivers', code: 'RI', x: 216, y: 362, zone: 'South South' },
  { state: 'Cross River', code: 'CR', x: 274, y: 332, zone: 'South South' },
];

function getActivityShade(count: number, maxCount: number): { fill: string; stroke: string; textColor: string } {
  if (count === 0 || maxCount === 0) {
    return { fill: '#F3F2EC', stroke: '#C8C5BA', textColor: '#475569' };
  }
  const ratio = count / maxCount;
  if (ratio >= 0.75) {
    return { fill: '#0F1C2E', stroke: '#0F1C2E', textColor: '#FFFFFF' };
  }
  if (ratio >= 0.45) {
    return { fill: '#1F6E72', stroke: '#155053', textColor: '#FFFFFF' };
  }
  if (ratio >= 0.2) {
    return { fill: '#79B4B6', stroke: '#1F6E72', textColor: '#0F1C2E' };
  }
  return { fill: '#CDE4E4', stroke: '#79B4B6', textColor: '#0F1C2E' };
}

export const NigeriaActivityMap: React.FC<NigeriaActivityMapProps> = ({ metrics }) => {
  const metricMap = useMemo(() => {
    const m = new Map<string, StateActivityMetric>();
    for (const item of metrics) m.set(item.state, item);
    return m;
  }, [metrics]);

  const defaultSelected = useMemo(() => {
    const sorted = [...metrics].sort((a, b) => b.total - a.total);
    return sorted[0]?.state || 'Lagos';
  }, [metrics]);

  const [selectedState, setSelectedState] = useState<string>(defaultSelected);

  const maxCount = useMemo(
    () => Math.max(1, ...metrics.map((m) => m.total)),
    [metrics],
  );

  const totalAll = useMemo(
    () => metrics.reduce((sum, m) => sum + m.total, 0),
    [metrics],
  );

  const activeMetric: StateActivityMetric = metricMap.get(selectedState) || {
    state: selectedState,
    total: 0,
    approved: 0,
    denied: 0,
    awaitingReview: 0,
  };

  const activeLayout = STATE_LAYOUT.find((s) => s.state === selectedState);

  return (
    <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 flex flex-col justify-between h-full">
      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-[#E2E0D8]">
        <div>
          <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
            Geographic Access Activity (Nigeria)
          </h3>
          <p className="text-xs text-[#647182] mt-0.5">
            Illustrative synthetic geographic data · Actual researcher locations are not inferred
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#647182]">
          <span>Low</span>
          <span className="inline-block w-3 h-3 rounded-xs bg-[#F3F2EC] border border-[#C8C5BA]" />
          <span className="inline-block w-3 h-3 rounded-xs bg-[#CDE4E4]" />
          <span className="inline-block w-3 h-3 rounded-xs bg-[#79B4B6]" />
          <span className="inline-block w-3 h-3 rounded-xs bg-[#1F6E72]" />
          <span className="inline-block w-3 h-3 rounded-xs bg-[#0F1C2E]" />
          <span>High</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 items-center">
        <div className="lg:col-span-7 relative">
          <svg
            viewBox="0 0 540 420"
            className="w-full h-auto max-h-[290px]"
            role="img"
            aria-label="Illustrative Nigeria state-level synthetic access request map"
          >
            {/* Geographically accurate continuous outline of Nigeria */}
            <path
              d="M 62 308 L 58 276 L 62 242 L 74 210 L 89 172 L 96 132 L 90 108 L 108 78 L 138 46 L 174 42 L 218 64 L 252 60 L 298 71 L 354 58 L 404 59 L 456 46 L 478 70 L 494 102 L 462 148 L 448 178 L 438 212 L 402 244 L 382 282 L 336 296 L 304 304 L 296 334 L 274 364 L 248 374 L 216 380 L 184 386 L 154 356 L 132 326 L 102 309 Z"
              fill="#F7F6F2"
              stroke="#B8B3A4"
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Subtle internal governance corridor lines */}
            <line x1="232" y1="214" x2="96" y2="312" stroke="#E2E0D8" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="232" y1="214" x2="270" y2="108" stroke="#E2E0D8" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="232" y1="214" x2="246" y2="294" stroke="#E2E0D8" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="232" y1="214" x2="216" y2="362" stroke="#E2E0D8" strokeWidth="1" strokeDasharray="3 3" />

            {STATE_LAYOUT.map((node) => {
              const stat = metricMap.get(node.state);
              const count = stat?.total ?? 0;
              const isSelected = selectedState === node.state;
              const palette = getActivityShade(count, maxCount);
              const radius = count > 0 ? Math.min(24, 13 + count * 1.4) : 12;

              return (
                <g
                  key={node.state}
                  className="cursor-pointer transition-transform duration-150"
                  onClick={() => setSelectedState(node.state)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedState(node.state);
                    }
                  }}
                  aria-label={`${node.state}: ${count} synthetic requests`}
                >
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 5}
                      fill="none"
                      stroke="#B4690E"
                      strokeWidth="2"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={palette.fill}
                    stroke={palette.stroke}
                    strokeWidth="1.5"
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill={palette.textColor}
                    className="font-mono-tabular text-[11px] font-semibold pointer-events-none"
                  >
                    {count}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + radius + 11}
                    textAnchor="middle"
                    fill="#3B495C"
                    className="text-[9.5px] font-medium pointer-events-none"
                  >
                    {node.state === 'FCT Abuja' ? 'Abuja' : node.state}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail Panel for Selected State */}
        <div className="lg:col-span-5 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md p-4 space-y-3">
          <div className="flex items-baseline justify-between border-b border-[#E2E0D8] pb-2">
            <div>
              <p className="text-xs text-[#647182]">Selected State</p>
              <h4 className="font-display text-base font-semibold text-[#0F1C2E]">
                {activeMetric.state}
              </h4>
              {activeLayout && (
                <p className="text-[11px] text-[#647182]">{activeLayout.zone} · Synthetic label</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-[#647182]">Total</p>
              <p className="font-mono-tabular text-xl font-semibold text-[#0F1C2E]">
                {activeMetric.total}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#3B495C]">Approved</span>
              <span className="font-mono-tabular font-medium text-[#176252]">
                {activeMetric.approved}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#3B495C]">Denied</span>
              <span className="font-mono-tabular font-medium text-[#9E2A2B]">
                {activeMetric.denied}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#3B495C]">Awaiting Review</span>
              <span className="font-mono-tabular font-medium text-[#B4690E]">
                {activeMetric.awaitingReview}
              </span>
            </div>
            <div className="pt-2 border-t border-[#E2E0D8] flex items-center justify-between">
              <span className="text-[#647182]">Share of Register</span>
              <span className="font-mono-tabular font-medium text-[#0F1C2E]">
                {totalAll > 0 ? `${((activeMetric.total / totalAll) * 100).toFixed(1)}%` : '0.0%'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#647182] leading-snug pt-1">
            Click any state node to inspect synthetic request volume calculated directly from Firestore records.
          </p>
        </div>
      </div>
    </div>
  );
};
