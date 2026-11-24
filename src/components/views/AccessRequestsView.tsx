import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Plus, Search, X } from 'lucide-react';
import {
  AccessRequest,
  ConsentReference,
  DATA_CATEGORIES,
  DataCategory,
  GovernancePolicy,
  NIGERIA_STATES,
  RESEARCH_PURPOSES,
  ResearchPurpose,
  Researcher,
} from '../../types/governance';
import { DecisionIndicator } from '../BrandMark';
import {
  createAccessRequest,
  evaluateRequestAndPersist,
} from '../../services/firestoreService';

interface AccessRequestsViewProps {
  user: User;
  requests: AccessRequest[];
  researchers: Researcher[];
  policies: GovernancePolicy[];
  consentReferences: ConsentReference[];
  initialStatusFilter?: string;
  selectedRequest: AccessRequest | null;
  onSelectRequest: (req: AccessRequest | null) => void;
}

export const AccessRequestsView: React.FC<AccessRequestsViewProps> = ({
  user,
  requests,
  researchers,
  policies,
  consentReferences,
  initialStatusFilter = 'ALL',
  selectedRequest,
  onSelectRequest,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [purposeFilter, setPurposeFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create form state
  const [researcherId, setResearcherId] = useState(researchers[0]?.researcherId || 'RES-001');
  const [organisation, setOrganisation] = useState(
    researchers[0]?.organisation || 'Ibadan Community Health Institute',
  );
  const [country, setCountry] = useState('Nigeria');
  const [stateOrRegion, setStateOrRegion] = useState<string>('Lagos');
  const [dataCategory, setDataCategory] = useState<DataCategory>('Health records');
  const [purpose, setPurpose] = useState<ResearchPurpose>('Public-health research');
  const [requestedDurationDays, setRequestedDurationDays] = useState<number>(60);
  const [consentReferenceId, setConsentReferenceId] = useState<string>('CREF-001');
  const [submitting, setSubmitting] = useState(false);

  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return [...requests]
      .filter((r) => {
        if (statusFilter !== 'ALL' && r.decisionStatus !== statusFilter) return false;
        if (purposeFilter !== 'ALL' && r.purpose !== purposeFilter) return false;
        if (q) {
          const hit =
            r.requestId.toLowerCase().includes(q) ||
            r.researcherId.toLowerCase().includes(q) ||
            r.organisation.toLowerCase().includes(q) ||
            r.stateOrRegion.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [requests, searchTerm, statusFilter, purposeFilter]);

  const handleResearcherChange = (resId: string) => {
    setResearcherId(resId);
    const match = researchers.find((r) => r.researcherId === resId);
    if (match) {
      setOrganisation(match.organisation);
      setCountry(match.country);
      setStateOrRegion(match.stateOrRegion);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent, evaluateImmediately: boolean) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setSubmitting(true);
    try {
      const created = await createAccessRequest(user, {
        researcherId,
        organisation,
        country,
        stateOrRegion,
        dataCategory,
        purpose,
        requestedDurationDays,
        consentReferenceId,
      });

      let finalRecord = created;
      if (evaluateImmediately) {
        finalRecord = await evaluateRequestAndPersist(
          user,
          created,
          researchers,
          policies,
          consentReferences,
        );
      }

      setShowCreateModal(false);
      onSelectRequest(finalRecord);
      setActionSuccess(
        evaluateImmediately
          ? `Request ${finalRecord.requestId} submitted and evaluated (${finalRecord.decisionStatus}).`
          : `Request ${finalRecord.requestId} submitted with status PENDING.`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit access request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluateExisting = async (req: AccessRequest) => {
    setActionError(null);
    setActionSuccess(null);
    setEvaluatingId(req.requestId);
    try {
      const updated = await evaluateRequestAndPersist(
        user,
        req,
        researchers,
        policies,
        consentReferences,
      );
      onSelectRequest(updated);
      setActionSuccess(
        `Evaluated ${updated.requestId}: decision set to ${updated.decisionStatus}.`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to evaluate request.');
    } finally {
      setEvaluatingId(null);
    }
  };

  const activeDetail = useMemo(() => {
    if (!selectedRequest) return null;
    return requests.find((r) => r.requestId === selectedRequest.requestId) || selectedRequest;
  }, [selectedRequest, requests]);

  return (
    <div className="space-y-5">
      {actionError && (
        <div className="bg-[#FBEEEE] border border-[#E5BABA] text-[#9E2A2B] px-4 py-3 rounded-md text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {actionSuccess && (
        <div className="bg-[#EBF6F3] border border-[#B5DDD3] text-[#176252] px-4 py-3 rounded-md text-xs flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-[#E2E0D8] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-[#647182] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Request ID, Researcher ID, or Organisation..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E] placeholder:text-[#647182] focus:outline-none focus:border-[#1F6E72]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by decision status"
            className="px-3 py-2 text-xs bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E] focus:outline-none focus:border-[#1F6E72]"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="DENIED">Denied</option>
            <option value="REVIEW">Review</option>
            <option value="PENDING">Pending Evaluation</option>
          </select>

          <select
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value)}
            aria-label="Filter by purpose"
            className="px-3 py-2 text-xs bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E] focus:outline-none focus:border-[#1F6E72]"
          >
            <option value="ALL">All Purposes</option>
            {RESEARCH_PURPOSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#0F1C2E] text-white rounded-md hover:bg-[#1A2D47] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Access Request</span>
        </button>
      </div>

      {/* Register Table */}
      <div className="bg-white border border-[#E2E0D8] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E2E0D8] flex items-center justify-between text-xs text-[#647182]">
          <span>
            Showing <strong className="font-mono-tabular text-[#0F1C2E]">{filteredRequests.length}</strong> of{' '}
            <strong className="font-mono-tabular text-[#0F1C2E]">{requests.length}</strong> access requests
          </span>
          <span>Click any row to inspect decision trace or run policy evaluation</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2] text-[11px] font-semibold text-[#647182]">
                <th className="py-2.5 px-4">Request ID</th>
                <th className="py-2.5 px-4">Researcher</th>
                <th className="py-2.5 px-4">Organisation</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4">Data Category</th>
                <th className="py-2.5 px-4">Purpose</th>
                <th className="py-2.5 px-4 text-right">Duration</th>
                <th className="py-2.5 px-4">Submitted</th>
                <th className="py-2.5 px-4">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEAE2] text-xs">
              {filteredRequests.map((req) => (
                <tr
                  key={req.requestId}
                  onClick={() => onSelectRequest(req)}
                  className={`transition-colors cursor-pointer ${
                    activeDetail?.requestId === req.requestId
                      ? 'bg-[#EAF3F3]'
                      : 'hover:bg-[#F7F6F2]'
                  }`}
                >
                  <td className="py-3 px-4 font-mono-tabular font-medium text-[#0F1C2E] whitespace-nowrap">
                    {req.requestId}
                    {req.isSynthetic && (
                      <span className="ml-1.5 text-[10px] text-[#647182] font-sans">· Synth</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-[#3B495C] whitespace-nowrap">
                    {req.researcherId}
                  </td>
                  <td className="py-3 px-4 text-[#0F1C2E] max-w-[190px] truncate">
                    {req.organisation}
                  </td>
                  <td className="py-3 px-4 text-[#647182] whitespace-nowrap">
                    {req.stateOrRegion}, {req.country}
                  </td>
                  <td className="py-3 px-4 text-[#3B495C] whitespace-nowrap">
                    {req.dataCategory}
                  </td>
                  <td className="py-3 px-4 text-[#3B495C] whitespace-nowrap">
                    {req.purpose}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-right text-[#3B495C] whitespace-nowrap">
                    {req.requestedDurationDays}d
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-[#647182] whitespace-nowrap">
                    {req.submittedAt.slice(0, 10)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <DecisionIndicator status={req.decisionStatus} />
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-[#647182]">
                    No access requests match the current search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Inspection Modal */}
      {activeDetail && (
        <div
          className="fixed inset-0 z-50 bg-[#0F1C2E]/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${activeDetail.requestId}`}
        >
          <div className="bg-white border border-[#E2E0D8] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-[#E2E0D8] pb-4">
              <div>
                <p className="text-xs text-[#647182]">
                  Access Request Record · {activeDetail.isSynthetic ? 'Synthetic Demonstration' : 'Live Submission'}
                </p>
                <h3 className="font-display text-lg font-semibold text-[#0F1C2E] mt-0.5 font-mono-tabular">
                  {activeDetail.requestId}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <DecisionIndicator status={activeDetail.decisionStatus} />
                <button
                  type="button"
                  onClick={() => onSelectRequest(null)}
                  className="p-1 text-[#647182] hover:text-[#0F1C2E] cursor-pointer"
                  aria-label="Close detail dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#647182] block">Researcher ID</span>
                <span className="font-mono-tabular font-medium text-[#0F1C2E]">
                  {activeDetail.researcherId}
                </span>
              </div>
              <div>
                <span className="text-[#647182] block">Organisation</span>
                <span className="font-medium text-[#0F1C2E]">{activeDetail.organisation}</span>
              </div>
              <div>
                <span className="text-[#647182] block">Geographic Label (Synthetic)</span>
                <span className="text-[#0F1C2E]">
                  {activeDetail.stateOrRegion}, {activeDetail.country}
                </span>
              </div>
              <div>
                <span className="text-[#647182] block">Requested Duration</span>
                <span className="font-mono-tabular text-[#0F1C2E]">
                  {activeDetail.requestedDurationDays} days
                </span>
              </div>
              <div>
                <span className="text-[#647182] block">Data Category</span>
                <span className="text-[#0F1C2E]">{activeDetail.dataCategory}</span>
              </div>
              <div>
                <span className="text-[#647182] block">Intended Purpose</span>
                <span className="text-[#0F1C2E]">{activeDetail.purpose}</span>
              </div>
              <div>
                <span className="text-[#647182] block">Consent Reference ID</span>
                <span className="font-mono-tabular text-[#0F1C2E]">
                  {activeDetail.consentReferenceId || 'None provided'}
                </span>
              </div>
              <div>
                <span className="text-[#647182] block">Submitted / Evaluated</span>
                <span className="font-mono-tabular text-[#0F1C2E]">
                  {activeDetail.submittedAt.slice(0, 16).replace('T', ' ')}
                  {activeDetail.evaluatedAt ? ` · ${activeDetail.evaluatedAt.slice(0, 16).replace('T', ' ')}` : ''}
                </span>
              </div>
            </div>

            <div className="bg-[#F7F6F2] border border-[#E2E0D8] rounded-md p-4 space-y-2">
              <p className="text-xs font-semibold text-[#0F1C2E]">Decision Explanation</p>
              <p className="text-xs text-[#3B495C] leading-relaxed">
                {activeDetail.decisionExplanation}
              </p>
              {activeDetail.matchedPolicyIds.length > 0 && (
                <p className="text-[11px] text-[#647182] font-mono-tabular pt-1">
                  Matched Policies: {activeDetail.matchedPolicyIds.join(' · ')}
                </p>
              )}
            </div>

            {activeDetail.evaluatedConditions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#0F1C2E]">
                  Deterministic Policy Conditions Checked
                </p>
                <ul className="space-y-1.5 text-xs font-mono-tabular bg-[#F7F6F2] border border-[#E2E0D8] rounded-md p-3">
                  {activeDetail.evaluatedConditions.map((cond, idx) => (
                    <li key={idx} className="text-[#3B495C] leading-snug">
                      {cond}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E0D8]">
              <p className="text-[11px] text-[#647182]">
                Authorisation metadata only — no health records are exposed.
              </p>
              <div className="flex items-center gap-2">
                {(activeDetail.decisionStatus === 'PENDING' ||
                  activeDetail.decisionStatus === 'REVIEW') && (
                  <button
                    type="button"
                    disabled={evaluatingId === activeDetail.requestId}
                    onClick={() => handleEvaluateExisting(activeDetail)}
                    className="px-4 py-2 text-xs font-medium bg-[#1F6E72] text-white rounded-md hover:bg-[#175558] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {evaluatingId === activeDetail.requestId
                      ? 'Evaluating...'
                      : 'Evaluate Against Active Policies'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectRequest(null)}
                  className="px-4 py-2 text-xs font-medium border border-[#E2E0D8] text-[#0F1C2E] rounded-md hover:bg-[#F7F6F2] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Access Request Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-[#0F1C2E]/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Submit new access request"
        >
          <div className="bg-white border border-[#E2E0D8] rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-[#E2E0D8] pb-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-[#0F1C2E]">
                  Submit New Access Request
                </h3>
                <p className="text-xs text-[#647182] mt-0.5">
                  Requests always start as PENDING; decisions are generated exclusively by the deterministic policy engine.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#647182] hover:text-[#0F1C2E] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSubmitNew(e, true)} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#0F1C2E] mb-1">Researcher</label>
                  <select
                    value={researcherId}
                    onChange={(e) => handleResearcherChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E]"
                  >
                    {researchers.map((r) => (
                      <option key={r.researcherId} value={r.researcherId}>
                        {r.researcherId} — {r.fullName} ({r.verificationStatus})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#0F1C2E] mb-1">Organisation</label>
                  <input
                    type="text"
                    required
                    value={organisation}
                    onChange={(e) => setOrganisation(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#0F1C2E] mb-1">State / Region (Synthetic)</label>
                  <select
                    value={stateOrRegion}
                    onChange={(e) => setStateOrRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E]"
                  >
                    {NIGERIA_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#0F1C2E] mb-1">Requested Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={1095}
                    required
                    value={requestedDurationDays}
                    onChange={(e) => setRequestedDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E] font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#0F1C2E] mb-1">Data Category</label>
                  <select
                    value={dataCategory}
                    onChange={(e) => setDataCategory(e.target.value as DataCategory)}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E]"
                  >
                    {DATA_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#0F1C2E] mb-1">Intended Purpose</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as ResearchPurpose)}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E]"
                  >
                    {RESEARCH_PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#0F1C2E] mb-1">
                  Consent Reference ID (Synthetic)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={consentReferenceId}
                    onChange={(e) => setConsentReferenceId(e.target.value)}
                    placeholder="e.g. CREF-001 (VALID), CREF-043 (EXPIRED), CREF-051 (REVOKED)"
                    className="flex-1 px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#0F1C2E] font-mono-tabular"
                  />
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setConsentReferenceId(e.target.value);
                    }}
                    aria-label="Quick select consent reference"
                    className="px-2 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md text-[#3B495C]"
                  >
                    <option value="">Quick pick...</option>
                    {consentReferences.slice(0, 12).map((c) => (
                      <option key={c.consentReferenceId} value={c.consentReferenceId}>
                        {c.consentReferenceId} ({c.consentStatus})
                      </option>
                    ))}
                    <option value="CREF-043">CREF-043 (EXPIRED)</option>
                    <option value="CREF-051">CREF-051 (REVOKED)</option>
                    <option value="CREF-056">CREF-056 (PENDING)</option>
                    <option value="CREF-INVALID">CREF-INVALID (Missing)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#E2E0D8]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 border border-[#E2E0D8] rounded-md text-[#3B495C] hover:bg-[#F7F6F2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => handleSubmitNew(e, false)}
                  className="px-3 py-2 border border-[#0F1C2E] text-[#0F1C2E] rounded-md hover:bg-[#F7F6F2] disabled:opacity-50 cursor-pointer"
                >
                  Submit Only (Pending)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0F1C2E] text-white font-medium rounded-md hover:bg-[#1A2D47] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit & Evaluate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
