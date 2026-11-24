import React from 'react';
import { ComplianceMetrics } from '../../types/governance';

interface ComplianceGaugeProps {
  metrics: ComplianceMetrics;
}

export const ComplianceGauge: React.FC<ComplianceGaugeProps> = ({ metrics }) => {
  const { compliantCount, evaluatedTotal, complianceRate } = metrics;
  const pct = complianceRate ?? 0;

  const cx = 130;
  const cy = 118;
  const radius = 86;
  const circumference = Math.PI * radius; // semicircle length
  const filledLength = (Math.min(100, Math.max(0, pct)) / 100) * circumference;

  const arcColor =
    complianceRate === null
      ? '#94A3B8'
      : pct >= 70
      ? '#176252'
      : pct >= 45
      ? '#1F6E72'
      : '#B4690E';

  return (
    <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 flex flex-col justify-between h-full">
      <div className="pb-3 border-b border-[#E2E0D8]">
        <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
          Policy Compliance Gauge
        </h3>
        <p className="text-xs text-[#647182] mt-0.5">
          Compliant approvals divided by evaluated requests (unresolved requests excluded)
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-4 flex-1">
        <svg viewBox="0 0 260 148" className="w-full max-w-[270px] h-auto" role="img" aria-label="Policy Compliance Semicircular Gauge">
          {/* Background semicircular track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#ECEAE2"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Value arc */}
          {complianceRate !== null && evaluatedTotal > 0 && (
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke={arcColor}
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray={`${filledLength} ${circumference}`}
            />
          )}

          {/* Tick labels */}
          <text x={cx - radius} y={cy + 20} textAnchor="middle" className="font-mono-tabular text-[10px] fill-[#647182]">
            0%
          </text>
          <text x={cx} y={cy - radius - 14} textAnchor="middle" className="font-mono-tabular text-[10px] fill-[#647182]">
            50%
          </text>
          <text x={cx + radius} y={cy + 20} textAnchor="middle" className="font-mono-tabular text-[10px] fill-[#647182]">
            100%
          </text>

          {/* Center readout */}
          <text x={cx} y={cy - 18} textAnchor="middle" className="font-mono-tabular text-[28px] font-semibold fill-[#0F1C2E]">
            {complianceRate === null ? '—' : `${complianceRate.toFixed(1)}%`}
          </text>
          <text x={cx} y={cy + 3} textAnchor="middle" className="text-[11px] fill-[#647182]">
            {evaluatedTotal === 0
              ? 'No evaluated requests yet'
              : `${compliantCount} / ${evaluatedTotal} evaluated requests`}
          </text>
        </svg>

        <div className="w-full mt-2 pt-3 border-t border-[#E2E0D8] grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#F7F6F2] rounded px-3 py-2">
            <span className="text-[#647182] block">Compliant (Numerator)</span>
            <span className="font-mono-tabular text-sm font-semibold text-[#0F1C2E]">
              {compliantCount}
            </span>
          </div>
          <div className="bg-[#F7F6F2] rounded px-3 py-2">
            <span className="text-[#647182] block">Evaluated (Denominator)</span>
            <span className="font-mono-tabular text-sm font-semibold text-[#0F1C2E]">
              {evaluatedTotal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
