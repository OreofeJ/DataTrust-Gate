import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ConsentReference, Researcher } from '../../types/governance';
import { DecisionIndicator } from '../BrandMark';

interface DataGovernanceViewProps {
  consentReferences: ConsentReference[];
  researchers: Researcher[];
}

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/health', desc: 'Service health, version, and integration status' },
  { method: 'GET', path: '/api/v1/dashboard/summary', desc: 'Aggregate counts of total, approved, denied, and review requests' },
  { method: 'GET', path: '/api/v1/dashboard/geography', desc: 'Synthetic Nigerian state-level request distribution' },
  { method: 'GET', path: '/api/v1/dashboard/decisions', desc: 'Decision breakdown percentages and counts' },
  { method: 'GET', path: '/api/v1/dashboard/compliance', desc: 'Policy compliance rate excluding unresolved requests' },
  { method: 'GET', path: '/api/v1/dashboard/activity', desc: 'Submitted vs evaluated request time-series' },
  { method: 'GET', path: '/api/v1/requests', desc: 'Searchable and filterable access request register' },
  { method: 'POST', path: '/api/v1/requests', desc: 'Submit new access request (forced PENDING initial status)' },
  { method: 'GET', path: '/api/v1/requests/:id', desc: 'Inspect single access request record' },
  { method: 'POST', path: '/api/v1/requests/:id/evaluate', desc: 'Run deterministic policy engine and record audit trail' },
  { method: 'GET', path: '/api/v1/policies', desc: 'List governance policies' },
  { method: 'POST', path: '/api/v1/policies', desc: 'Create new governance policy (admin)' },
  { method: 'PATCH', path: '/api/v1/policies/:id', desc: 'Activate or deactivate governance policy (admin)' },
  { method: 'GET', path: '/api/v1/consent-references', desc: 'List synthetic consent references' },
  { method: 'GET', path: '/api/v1/audit', desc: 'Query append-only governance audit events' },
];

export const DataGovernanceView: React.FC<DataGovernanceViewProps> = ({
  consentReferences,
  researchers,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [healthResult, setHealthResult] = useState<string | null>(null);
  const [testingHealth, setTestingHealth] = useState(false);

  const filteredConsents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...consentReferences]
      .filter((c) => {
        if (statusFilter !== 'ALL' && c.consentStatus !== statusFilter) return false;
        if (q) {
          const hit =
            c.consentReferenceId.toLowerCase().includes(q) ||
            c.pseudonymousSubjectId.toLowerCase().includes(q) ||
            c.organisation.toLowerCase().includes(q) ||
            c.externalSourceId.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => a.consentReferenceId.localeCompare(b.consentReferenceId));
  }, [consentReferences, search, statusFilter]);

  const handleTestHealth = async () => {
    setTestingHealth(true);
    try {
      const resp = await fetch('/api/v1/health');
      const data = await resp.json();
      setHealthResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setHealthResult(err instanceof Error ? err.message : 'Health probe failed');
    } finally {
      setTestingHealth(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Architecture & HDC Boundary Notice */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 space-y-2">
          <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
            Consent Reference Boundary (Pre-HDC Adapter)
          </h3>
          <p className="text-xs text-[#3B495C] leading-relaxed">
            DataTrust Gate verifies consent references through an isolated{' '}
            <code className="font-mono-tabular bg-[#F7F6F2] px-1 py-0.5 rounded">
              ConsentVerificationProvider
            </code>{' '}
            service interface. In this MVP, lookups resolve against synthetic{' '}
            <code className="font-mono-tabular bg-[#F7F6F2] px-1 py-0.5 rounded">
              consentReferences
            </code>{' '}
            stored in Cloud Firestore.
          </p>
          <p className="text-xs text-[#B4690E] font-medium pt-1">
            Prototype Notice: This MVP is not connected to a live Health Data Cooperative (HDC) instance and stores zero real patient records.
          </p>
        </div>

        <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 space-y-2">
          <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
            Researcher Directory Summary
          </h3>
          <p className="text-xs text-[#3B495C] leading-relaxed">
            Fictional researcher profiles registered in the synthetic governance directory.
            Suspended researchers fail closed as DENIED; pending verification triggers REVIEW.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
            <div className="bg-[#F7F6F2] rounded p-2.5">
              <span className="text-[#647182] block">Verified</span>
              <span className="font-mono-tabular text-base font-semibold text-[#176252]">
                {researchers.filter((r) => r.verificationStatus === 'VERIFIED').length}
              </span>
            </div>
            <div className="bg-[#F7F6F2] rounded p-2.5">
              <span className="text-[#647182] block">Pending</span>
              <span className="font-mono-tabular text-base font-semibold text-[#B4690E]">
                {researchers.filter((r) => r.verificationStatus === 'PENDING').length}
              </span>
            </div>
            <div className="bg-[#F7F6F2] rounded p-2.5">
              <span className="text-[#647182] block">Suspended</span>
              <span className="font-mono-tabular text-base font-semibold text-[#9E2A2B]">
                {researchers.filter((r) => r.verificationStatus === 'SUSPENDED').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Synthetic Consent Reference Registry */}
      <div className="bg-white border border-[#E2E0D8] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#E2E0D8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
              Synthetic Consent References
            </h3>
            <p className="text-xs text-[#647182]">
              Showing {filteredConsents.length} of {consentReferences.length} synthetic records
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#647182] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, Subject, or Org..."
                className="pl-9 pr-3 py-1.5 text-xs bg-[#F7F6F2] border border-[#E2E0D8] rounded-md"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter consent status"
              className="px-3 py-1.5 text-xs bg-[#F7F6F2] border border-[#E2E0D8] rounded-md"
            >
              <option value="ALL">All Consent States</option>
              <option value="VALID">Valid</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#F7F6F2]">
              <tr className="border-b border-[#E2E0D8] text-[11px] font-semibold text-[#647182]">
                <th className="py-2.5 px-4">Consent Ref ID</th>
                <th className="py-2.5 px-4">Subject Token</th>
                <th className="py-2.5 px-4">Organisation</th>
                <th className="py-2.5 px-4">Permitted Purpose</th>
                <th className="py-2.5 px-4">Categories</th>
                <th className="py-2.5 px-4">Expiry</th>
                <th className="py-2.5 px-4">External Source</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEAE2] text-xs">
              {filteredConsents.map((c) => (
                <tr key={c.consentReferenceId} className="hover:bg-[#F7F6F2]">
                  <td className="py-2.5 px-4 font-mono-tabular font-medium text-[#0F1C2E] whitespace-nowrap">
                    {c.consentReferenceId}
                  </td>
                  <td className="py-2.5 px-4 font-mono-tabular text-[#3B495C] whitespace-nowrap">
                    {c.pseudonymousSubjectId}
                  </td>
                  <td className="py-2.5 px-4 text-[#0F1C2E] max-w-[190px] truncate">
                    {c.organisation}
                  </td>
                  <td className="py-2.5 px-4 text-[#3B495C] whitespace-nowrap">
                    {c.permittedPurpose}
                  </td>
                  <td className="py-2.5 px-4 text-[#647182] max-w-[200px] truncate">
                    {c.permittedDataCategories.join(', ')}
                  </td>
                  <td className="py-2.5 px-4 font-mono-tabular text-[#647182] whitespace-nowrap">
                    {c.expiryDate.slice(0, 10)}
                  </td>
                  <td className="py-2.5 px-4 font-mono-tabular text-[#647182] whitespace-nowrap">
                    {c.externalSourceId}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <DecisionIndicator status={c.consentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REST API Documentation */}
      <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E0D8] pb-3">
          <div>
            <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
              REST API Specification (v1)
            </h3>
            <p className="text-xs text-[#647182]">
              Protected routes require a Firebase Auth ID token via Authorization: Bearer &lt;token&gt;
            </p>
          </div>
          <button
            type="button"
            disabled={testingHealth}
            onClick={handleTestHealth}
            className="px-3 py-1.5 text-xs font-medium bg-[#1F6E72] text-white rounded-md hover:bg-[#175558] disabled:opacity-50 cursor-pointer"
          >
            {testingHealth ? 'Checking...' : 'Probe GET /api/v1/health'}
          </button>
        </div>

        {healthResult && (
          <pre className="bg-[#0F1C2E] text-[#E6F1F1] p-3 rounded-md text-[11px] font-mono-tabular overflow-x-auto">
            {healthResult}
          </pre>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {API_ENDPOINTS.map((ep) => (
            <div
              key={`${ep.method}-${ep.path}`}
              className="border border-[#E2E0D8] bg-[#F7F6F2] rounded px-3 py-2 flex items-start gap-2.5"
            >
              <span className="font-mono-tabular text-[11px] font-semibold text-[#1F6E72] w-12 shrink-0">
                {ep.method}
              </span>
              <div className="min-w-0">
                <p className="font-mono-tabular font-medium text-[#0F1C2E] truncate">
                  {ep.path}
                </p>
                <p className="text-[11px] text-[#647182]">{ep.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
