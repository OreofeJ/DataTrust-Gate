import React, { useMemo } from 'react';
import {
  AccessRequest,
  GovernancePolicy,
} from '../../types/governance';
import {
  computeComplianceMetrics,
  computeDashboardSummary,
  computeDecisionDistribution,
  computeGeographyMetrics,
} from '../../services/analytics';
import { NigeriaActivityMap } from '../charts/NigeriaActivityMap';
import { DecisionDonutChart } from '../charts/DecisionDonutChart';
import { ComplianceGauge } from '../charts/ComplianceGauge';
import { ActivityTimelineChart } from '../charts/ActivityTimelineChart';
import { DecisionIndicator } from '../BrandMark';

interface OverviewViewProps {
  requests: AccessRequest[];
  policies: GovernancePolicy[];
  onNavigateToRequests: (statusFilter?: string) => void;
  onInspectRequest: (req: AccessRequest) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  requests,
  policies,
  onNavigateToRequests,
  onInspectRequest,
}) => {
  const summary = useMemo(() => computeDashboardSummary(requests), [requests]);
  const geography = useMemo(() => computeGeographyMetrics(requests), [requests]);
  const distribution = useMemo(() => computeDecisionDistribution(requests), [requests]);
  const compliance = useMemo(() => computeComplianceMetrics(requests), [requests]);

  const activePolicyCount = useMemo(
    () => policies.filter((p) => p.status === 'ACTIVE').length,
    [policies],
  );

  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .slice(0, 5),
    [requests],
  );

  const summaryCards = [
    {
      label: 'Total Access Requests',
      value: summary.totalRequests,
      context: `${activePolicyCount} active governance policies`,
      bgClass: 'bg-[#244A73] border-[#1D3C5E] hover:bg-[#204267]',
      filter: 'ALL',
    },
    {
      label: 'Approved',
      value: summary.approved,
      context: 'All policy & consent checks passed',
      bgClass: 'bg-[#287A55] border-[#216647] hover:bg-[#236D4B]',
      filter: 'APPROVED',
    },
    {
      label: 'Denied',
      value: summary.denied,
      context: 'Failed closed on policy or consent rules',
      bgClass: 'bg-[#79533B] border-[#644430] hover:bg-[#6C4A34]',
      filter: 'DENIED',
    },
    {
      label: 'Awaiting Review',
      value: summary.awaitingReview,
      context: `${summary.reviewCount} panel review · ${summary.pendingCount} pending evaluation`,
      bgClass: 'bg-[#A66B19] border-[#8D5A14] hover:bg-[#976116]',
      filter: 'REVIEW',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Four Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => onNavigateToRequests(card.filter)}
            className={`text-left border rounded-lg p-5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1C2E] ${card.bgClass}`}
          >
            <p className="text-xs font-medium text-white/90">{card.label}</p>
            <p className="font-mono-tabular text-3xl font-semibold mt-2 text-white">
              {card.value}
            </p>
            <p className="text-xs text-white/80 mt-2 truncate">{card.context}</p>
          </button>
        ))}
      </div>

      {/* Four Visualisations */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7">
          <NigeriaActivityMap metrics={geography} />
        </div>
        <div className="xl:col-span-5">
          <DecisionDonutChart distribution={distribution} />
        </div>
        <div className="xl:col-span-5">
          <ComplianceGauge metrics={compliance} />
        </div>
        <div className="xl:col-span-7">
          <ActivityTimelineChart requests={requests} />
        </div>
      </div>

      {/* Recent Register Preview */}
      <div className="bg-white border border-[#E2E0D8] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E0D8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
              Recent Access Requests
            </h3>
            <p className="text-xs text-[#647182] mt-0.5">
              Authorisation records only · No underlying health records are transferred or exposed
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToRequests('ALL')}
            className="px-3 py-1.5 text-xs font-medium text-[#1F6E72] border border-[#E2E0D8] rounded-md hover:bg-[#F7F6F2] transition-colors cursor-pointer whitespace-nowrap"
          >
            View Full Register
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2] text-[11px] font-semibold text-[#647182]">
                <th className="py-2.5 px-4">Request ID</th>
                <th className="py-2.5 px-4">Organisation</th>
                <th className="py-2.5 px-4">Data Category</th>
                <th className="py-2.5 px-4">Purpose</th>
                <th className="py-2.5 px-4">State</th>
                <th className="py-2.5 px-4 text-right">Duration</th>
                <th className="py-2.5 px-4">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEAE2] text-xs">
              {recentRequests.map((req) => (
                <tr
                  key={req.requestId}
                  onClick={() => onInspectRequest(req)}
                  className="hover:bg-[#F7F6F2] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono-tabular font-medium text-[#0F1C2E] whitespace-nowrap">
                    {req.requestId}
                  </td>
                  <td className="py-3 px-4 text-[#0F1C2E] max-w-[200px] truncate">
                    {req.organisation}
                  </td>
                  <td className="py-3 px-4 text-[#3B495C] whitespace-nowrap">
                    {req.dataCategory}
                  </td>
                  <td className="py-3 px-4 text-[#3B495C] whitespace-nowrap">
                    {req.purpose}
                  </td>
                  <td className="py-3 px-4 text-[#647182] whitespace-nowrap">
                    {req.stateOrRegion}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-right text-[#3B495C] whitespace-nowrap">
                    {req.requestedDurationDays}d
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <DecisionIndicator status={req.decisionStatus} />
                  </td>
                </tr>
              ))}
              {recentRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#647182]">
                    No access requests found in Firestore.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
