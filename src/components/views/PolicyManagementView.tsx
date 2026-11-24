import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Plus, X } from 'lucide-react';
import {
  DATA_CATEGORIES,
  GovernancePolicy,
  RESEARCH_PURPOSES,
} from '../../types/governance';
import { DecisionIndicator } from '../BrandMark';
import {
  createGovernancePolicy,
  updateGovernancePolicyStatus,
} from '../../services/firestoreService';

interface PolicyManagementViewProps {
  user: User;
  isAdmin: boolean;
  policies: GovernancePolicy[];
}

export const PolicyManagementView: React.FC<PolicyManagementViewProps> = ({
  user,
  isAdmin,
  policies,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedPolicy, setSelectedPolicy] = useState<GovernancePolicy | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);

  // Form state
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const [orgsInput, setOrgsInput] = useState('*');
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>(['Public-health research']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Health records']);
  const [maxDurationDays, setMaxDurationDays] = useState(90);
  const [requiresConsent, setRequiresConsent] = useState(true);
  const [communityRestrictionNote, setCommunityRestrictionNote] = useState(
    'Community stewardship rules apply; aggregated outputs only.',
  );

  const filteredPolicies = useMemo(() => {
    return [...policies]
      .filter((p) => (statusFilter === 'ALL' ? true : p.status === statusFilter))
      .sort((a, b) => a.policyId.localeCompare(b.policyId));
  }, [policies, statusFilter]);

  const toggleItem = (list: string[], item: string, setter: (next: string[]) => void) => {
    if (list.includes(item)) {
      if (list.length === 1) return;
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setBusyId('NEW');
    try {
      const orgs = orgsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const created = await createGovernancePolicy(user, {
        policyName,
        description,
        permittedOrganisations: orgs.length > 0 ? orgs : ['*'],
        permittedPurposes: selectedPurposes,
        permittedDataCategories: selectedCategories,
        maxDurationDays,
        requiresConsent,
        communityRestrictionNote,
      });
      setShowCreateModal(false);
      setPolicyName('');
      setDescription('');
      setFeedback({ type: 'ok', text: `Created policy ${created.policyId} (${created.policyName}).` });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Policy creation requires administrator permissions.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = async (pol: GovernancePolicy) => {
    const nextStatus = pol.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setFeedback(null);
    setBusyId(pol.policyId);
    try {
      await updateGovernancePolicyStatus(user, pol, nextStatus);
      setSelectedPolicy({ ...pol, status: nextStatus });
      setFeedback({
        type: 'ok',
        text: `Policy ${pol.policyId} status updated to ${nextStatus}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Updating policies requires administrator permissions.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {feedback && (
        <div
          className={`px-4 py-3 rounded-md border text-xs flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-[#FBEEEE] border-[#E5BABA] text-[#9E2A2B]'
              : 'bg-[#EBF6F3] border-[#B5DDD3] text-[#176252]'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white border border-[#E2E0D8] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#F0EFE9] rounded-md">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white text-[#0F1C2E] shadow-xs'
                  : 'text-[#647182] hover:text-[#0F1C2E]'
              }`}
            >
              {tab === 'ALL' ? 'All Policies' : tab === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!isAdmin && (
            <span className="text-xs text-[#647182]">
              Read-only mode · Policy mutations require admin account
            </span>
          )}
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#0F1C2E] text-white rounded-md hover:bg-[#1A2D47] disabled:opacity-45 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Policy</span>
          </button>
        </div>
      </div>

      {/* Policy Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPolicies.map((pol) => (
          <div
            key={pol.policyId}
            className="bg-white border border-[#E2E0D8] rounded-lg p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] text-[#647182] font-mono-tabular">
                    {pol.policyId} · Max {pol.maxDurationDays}d ·{' '}
                    {pol.requiresConsent ? 'Consent Required' : 'Anonymous Open'}
                  </div>
                  <h3 className="font-display text-base font-semibold text-[#0F1C2E] mt-0.5">
                    {pol.policyName}
                  </h3>
                </div>
                <DecisionIndicator status={pol.status} />
              </div>

              <p className="text-xs text-[#3B495C] leading-relaxed">{pol.description}</p>

              <div className="pt-2 space-y-1.5 text-xs">
                <div>
                  <span className="text-[#647182]">Purposes: </span>
                  <span className="text-[#0F1C2E]">{pol.permittedPurposes.join(' · ')}</span>
                </div>
                <div>
                  <span className="text-[#647182]">Categories: </span>
                  <span className="text-[#0F1C2E]">{pol.permittedDataCategories.join(' · ')}</span>
                </div>
                <div>
                  <span className="text-[#647182]">Organisations: </span>
                  <span className="text-[#0F1C2E]">
                    {pol.permittedOrganisations.includes('*')
                      ? 'Any verified research organisation (*)'
                      : pol.permittedOrganisations.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#ECEAE2] flex items-center justify-between gap-2 text-xs">
              <span className="font-mono-tabular text-[11px] text-[#647182]">
                Created {pol.createdAt.slice(0, 10)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPolicy(pol)}
                  className="px-3 py-1.5 border border-[#E2E0D8] rounded text-[#0F1C2E] hover:bg-[#F7F6F2] cursor-pointer"
                >
                  Inspect
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={busyId === pol.policyId}
                    onClick={() => handleToggleStatus(pol)}
                    className={`px-3 py-1.5 rounded font-medium cursor-pointer disabled:opacity-50 ${
                      pol.status === 'ACTIVE'
                        ? 'border border-[#E5BABA] text-[#9E2A2B] hover:bg-[#FBEEEE]'
                        : 'border border-[#B5DDD3] text-[#176252] hover:bg-[#EBF6F3]'
                    }`}
                  >
                    {pol.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Policy Modal */}
      {selectedPolicy && (
        <div
          className="fixed inset-0 z-50 bg-[#0F1C2E]/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-[#E2E0D8] rounded-lg max-w-xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-[#E2E0D8] pb-3">
              <div>
                <p className="font-mono-tabular text-xs text-[#647182]">{selectedPolicy.policyId}</p>
                <h3 className="font-display text-lg font-semibold text-[#0F1C2E]">
                  {selectedPolicy.policyName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className="p-1 text-[#647182] hover:text-[#0F1C2E] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#647182]">Status</span>
                <DecisionIndicator status={selectedPolicy.status} />
              </div>
              <p className="text-[#3B495C] leading-relaxed">{selectedPolicy.description}</p>
              <div className="bg-[#F7F6F2] border border-[#E2E0D8] rounded p-3 space-y-2">
                <p>
                  <strong className="text-[#0F1C2E]">Permitted Purposes:</strong>{' '}
                  {selectedPolicy.permittedPurposes.join(', ')}
                </p>
                <p>
                  <strong className="text-[#0F1C2E]">Permitted Data Categories:</strong>{' '}
                  {selectedPolicy.permittedDataCategories.join(', ')}
                </p>
                <p>
                  <strong className="text-[#0F1C2E]">Permitted Organisations:</strong>{' '}
                  {selectedPolicy.permittedOrganisations.join(', ')}
                </p>
                <p>
                  <strong className="text-[#0F1C2E]">Access Duration Limit:</strong>{' '}
                  <span className="font-mono-tabular">{selectedPolicy.maxDurationDays} days</span>
                </p>
                <p>
                  <strong className="text-[#0F1C2E]">Consent Reference Required:</strong>{' '}
                  {selectedPolicy.requiresConsent ? 'Yes (strict)' : 'No'}
                </p>
                <p>
                  <strong className="text-[#0F1C2E]">Community Restriction Note:</strong>{' '}
                  {selectedPolicy.communityRestrictionNote}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E0D8]">
              {isAdmin && (
                <button
                  type="button"
                  disabled={busyId === selectedPolicy.policyId}
                  onClick={() => handleToggleStatus(selectedPolicy)}
                  className="px-4 py-2 text-xs font-medium border border-[#E2E0D8] rounded-md hover:bg-[#F7F6F2] cursor-pointer"
                >
                  {selectedPolicy.status === 'ACTIVE' ? 'Deactivate Policy' : 'Reactivate Policy'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className="px-4 py-2 text-xs font-medium bg-[#0F1C2E] text-white rounded-md cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-[#0F1C2E]/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-[#E2E0D8] rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-[#E2E0D8] pb-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-[#0F1C2E]">
                  Create Governance Policy
                </h3>
                <p className="text-xs text-[#647182]">
                  Evaluated deterministically during access request checks.
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

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#0F1C2E] mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g. Regional Malaria Surveillance Access Rule"
                  className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0F1C2E] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope, stewardship intent, and constraints..."
                  className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0F1C2E] mb-1">
                  Permitted Organisations (comma-separated, or * for any verified org)
                </label>
                <input
                  type="text"
                  value={orgsInput}
                  onChange={(e) => setOrgsInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0F1C2E] mb-1.5">Permitted Purposes</label>
                <div className="flex flex-wrap gap-1.5">
                  {RESEARCH_PURPOSES.map((p) => {
                    const active = selectedPurposes.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleItem(selectedPurposes, p, setSelectedPurposes)}
                        className={`px-2.5 py-1 rounded border cursor-pointer ${
                          active
                            ? 'bg-[#0F1C2E] text-white border-[#0F1C2E]'
                            : 'bg-[#F7F6F2] text-[#3B495C] border-[#E2E0D8]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#0F1C2E] mb-1.5">Permitted Data Categories</label>
                <div className="flex flex-wrap gap-1.5">
                  {DATA_CATEGORIES.map((c) => {
                    const active = selectedCategories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleItem(selectedCategories, c, setSelectedCategories)}
                        className={`px-2.5 py-1 rounded border cursor-pointer ${
                          active
                            ? 'bg-[#1F6E72] text-white border-[#1F6E72]'
                            : 'bg-[#F7F6F2] text-[#3B495C] border-[#E2E0D8]'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#0F1C2E] mb-1">Max Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={1095}
                    required
                    value={maxDurationDays}
                    onChange={(e) => setMaxDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md font-mono-tabular"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresConsent}
                      onChange={(e) => setRequiresConsent(e.target.checked)}
                    />
                    <span className="font-medium text-[#0F1C2E]">Require valid consent reference</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#0F1C2E] mb-1">Community Restriction Note</label>
                <input
                  type="text"
                  value={communityRestrictionNote}
                  onChange={(e) => setCommunityRestrictionNote(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F6F2] border border-[#E2E0D8] rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E0D8]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 border border-[#E2E0D8] rounded-md text-[#3B495C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'NEW'}
                  className="px-4 py-2 bg-[#0F1C2E] text-white font-medium rounded-md hover:bg-[#1A2D47] disabled:opacity-50 cursor-pointer"
                >
                  {busyId === 'NEW' ? 'Saving...' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
