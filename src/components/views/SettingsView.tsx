import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  APP_VERSION,
  GovernancePolicy,
  MVP_LABEL,
} from '../../types/governance';
import {
  ConnectionProbeResult,
  testFirestoreConnection,
} from '../../firebase';
import { resetSyntheticData } from '../../services/firestoreService';
import { DecisionIndicator } from '../BrandMark';

interface SettingsViewProps {
  user: User;
  isAdmin: boolean;
  policies: GovernancePolicy[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  isAdmin,
  policies,
}) => {
  const [dbStatus, setDbStatus] = useState<ConnectionProbeResult | null>(null);
  const [apiHealth, setApiHealth] = useState<{ ok: boolean; detail: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const runDiagnostics = async () => {
    const dbRes = await testFirestoreConnection();
    setDbStatus(dbRes);

    try {
      const resp = await fetch('/api/v1/health');
      const json = await resp.json();
      setApiHealth({
        ok: Boolean(resp.ok && json.ok),
        detail: json.ok ? `Healthy · ${json.service} v${json.version}` : 'Degraded response',
      });
    } catch {
      setApiHealth({ ok: false, detail: 'REST API unreachable' });
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleResetSynthetic = async () => {
    setResetting(true);
    setResetMessage(null);
    try {
      await resetSyntheticData(user);
      setConfirmReset(false);
      setResetMessage(
        'Synthetic demonstration dataset reset cleanly. Non-synthetic records and append-only audit events were preserved.',
      );
    } catch (err) {
      setResetMessage(
        err instanceof Error ? err.message : 'Synthetic dataset reset requires administrator privileges.',
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 space-y-1">
          <p className="text-xs text-[#647182]">Application Version</p>
          <p className="font-mono-tabular text-lg font-semibold text-[#0F1C2E]">
            v{APP_VERSION}
          </p>
          <p className="text-xs text-[#1F6E72] font-medium">{MVP_LABEL}</p>
        </div>

        <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 space-y-1">
          <p className="text-xs text-[#647182]">Database Connection</p>
          <p className="text-sm font-semibold text-[#0F1C2E]">
            {dbStatus === null
              ? 'Checking...'
              : dbStatus.connected
              ? 'Connected'
              : 'Disconnected'}
          </p>
          <p className="text-xs text-[#647182]">
            {dbStatus?.detail || 'Cloud Firestore'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 space-y-1">
          <p className="text-xs text-[#647182]">REST API Health</p>
          <p className="text-sm font-semibold text-[#0F1C2E]">
            {apiHealth === null ? 'Checking...' : apiHealth.ok ? 'Operational' : 'Unavailable'}
          </p>
          <p className="text-xs text-[#647182]">
            {apiHealth?.detail || 'Probing /api/v1/health'}
          </p>
        </div>
      </div>

      {/* Synthetic Data & Scope Notice */}
      <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#E2E0D8] pb-3">
          <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
            Prototype Environment & Synthetic Data Notice
          </h3>
          <button
            type="button"
            onClick={runDiagnostics}
            className="px-3 py-1.5 text-xs border border-[#E2E0D8] rounded hover:bg-[#F7F6F2] cursor-pointer"
          >
            Re-check Status
          </button>
        </div>
        <p className="text-xs text-[#3B495C] leading-relaxed">
          DataTrust Gate ({MVP_LABEL}) is an open-source prototype demonstrating deterministic health
          research access governance, consent-reference validation, and application-level auditing. All
          initial researchers, access requests, consent references, and Nigerian state geographic labels
          are synthetic demonstration records. No real patient health records or clinical data payloads
          are stored or transferred.
        </p>
        <p className="text-xs text-[#647182]">
          Signed in as <strong className="text-[#0F1C2E]">{user.email}</strong> · Role:{' '}
          <strong className="text-[#0F1C2E]">
            {isAdmin ? 'Prototype Administrator' : 'Researcher / Reviewer'}
          </strong>
        </p>
      </div>

      {/* Demonstration Policies Summary */}
      <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 space-y-3">
        <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
          Available Demonstration Policies ({policies.length})
        </h3>
        <div className="divide-y divide-[#ECEAE2] text-xs">
          {policies.map((p) => (
            <div key={p.policyId} className="py-2.5 flex items-center justify-between gap-4">
              <div>
                <span className="font-mono-tabular font-medium text-[#0F1C2E] mr-2">
                  {p.policyId}
                </span>
                <span className="text-[#3B495C]">{p.policyName}</span>
              </div>
              <DecisionIndicator status={p.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Confirmed Synthetic Data Reset */}
      <div className="bg-white border border-[#E2E0D8] rounded-lg p-5 space-y-3">
        <h3 className="font-display text-base font-semibold text-[#0F1C2E]">
          Reset Synthetic Demonstration Data
        </h3>
        <p className="text-xs text-[#3B495C] leading-relaxed">
          Restores the initial 40 synthetic access requests, 12 synthetic governance policies, 60 synthetic
          consent references, and synthetic researchers. Any user-submitted (non-synthetic) access requests,
          custom policies, and the append-only audit trail are preserved untouched.
        </p>

        {resetMessage && (
          <div className="p-3 bg-[#F7F6F2] border border-[#E2E0D8] rounded text-xs text-[#0F1C2E]">
            {resetMessage}
          </div>
        )}

        {!isAdmin ? (
          <p className="text-xs text-[#647182]">
            Reset is restricted to the prototype administrator account.
          </p>
        ) : !confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="px-4 py-2 text-xs font-medium border border-[#E5BABA] text-[#9E2A2B] rounded-md hover:bg-[#FBEEEE] cursor-pointer"
          >
            Reset Synthetic Dataset...
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              disabled={resetting}
              onClick={handleResetSynthetic}
              className="px-4 py-2 text-xs font-medium bg-[#9E2A2B] text-white rounded-md hover:bg-[#822122] disabled:opacity-50 cursor-pointer"
            >
              {resetting ? 'Resetting Synthetic Records...' : 'Confirm Synthetic Data Reset'}
            </button>
            <button
              type="button"
              disabled={resetting}
              onClick={() => setConfirmReset(false)}
              className="px-3 py-2 text-xs border border-[#E2E0D8] rounded-md text-[#3B495C] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
