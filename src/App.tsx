import React, { useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Activity,
  FileCheck2,
  History,
  LayoutDashboard,
  Menu,
  Scale,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  testFirestoreConnection,
} from './firebase';
import {
  AccessRequest,
  AuditEvent,
  BOOTSTRAP_ADMIN_EMAIL,
  ConsentReference,
  GovernancePolicy,
  MVP_LABEL,
  Researcher,
} from './types/governance';
import {
  seedSyntheticDataIfEmpty,
  subscribeCollectionWithAccess,
} from './services/firestoreService';
import { BrandMark } from './components/BrandMark';
import { OverviewView } from './components/views/OverviewView';
import { AccessRequestsView } from './components/views/AccessRequestsView';
import { PolicyManagementView } from './components/views/PolicyManagementView';
import { DataGovernanceView } from './components/views/DataGovernanceView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { SettingsView } from './components/views/SettingsView';

type NavKey =
  | 'overview'
  | 'requests'
  | 'policies'
  | 'governance'
  | 'audit'
  | 'settings';

const NAV_ITEMS: Array<{
  key: NavKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'Real-time governance posture, synthetic geographic activity, and compliance telemetry.',
    icon: LayoutDashboard,
  },
  {
    key: 'requests',
    label: 'Access Requests',
    description: 'Searchable request register with olicy evaluation and decision explanations.',
    icon: FileCheck2,
  },
  {
    key: 'policies',
    label: 'Policy Management',
    description: 'Inspect, create, and deactivate community-governed health data access rules.',
    icon: Scale,
  },
  {
    key: 'governance',
    label: 'Data Governance',
    description: 'Synthetic consent references, pre-HDC integration boundary, and REST API reference.',
    icon: ShieldCheck,
  },
  {
    key: 'audit',
    label: 'Audit Trail',
    description: 'Append-only application-level log of submissions, consent checks, evaluations, and policy updates.',
    icon: History,
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Runtime diagnostics, synthetic-data notice, and controlled demonstration reset.',
    icon: Settings,
  },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [activeNav, setActiveNav] = useState<NavKey>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [requestsFilterHint, setRequestsFilterHint] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);

  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [policies, setPolicies] = useState<GovernancePolicy[]>([]);
  const [consentReferences, setConsentReferences] = useState<ConsentReference[]>([]);
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isAdmin = Boolean(
    user?.email && user.emailVerified && user.email === BOOTSTRAP_ADMIN_EMAIL,
  );

  useEffect(() => {
    if (!user) {
      setAccessRequests([]);
      setPolicies([]);
      setConsentReferences([]);
      setResearchers([]);
      setAuditEvents([]);
      return;
    }

    let cancelled = false;
    setSeeding(true);
    setSeedError(null);

    seedSyntheticDataIfEmpty(user)
      .catch((err) => {
        if (!cancelled) {
          setSeedError(err instanceof Error ? err.message : 'Initial seed check failed.');
        }
      })
      .finally(() => {
        if (!cancelled) setSeeding(false);
      });

    const unsubReq = subscribeCollectionWithAccess<AccessRequest>(
      'accessRequests',
      'requestId',
      user,
      isAdmin,
      'submittedByUid',
      setAccessRequests,
    );
    const unsubPol = subscribeCollectionWithAccess<GovernancePolicy>(
      'governancePolicies',
      'policyId',
      user,
      isAdmin,
      'createdByUid',
      setPolicies,
    );
    const unsubConsent = subscribeCollectionWithAccess<ConsentReference>(
      'consentReferences',
      'consentReferenceId',
      user,
      isAdmin,
      'createdByUid',
      setConsentReferences,
    );
    const unsubRes = subscribeCollectionWithAccess<Researcher>(
      'researchers',
      'researcherId',
      user,
      isAdmin,
      'createdByUid',
      setResearchers,
    );
    const unsubAudit = subscribeCollectionWithAccess<AuditEvent>(
      'auditEvents',
      'eventId',
      user,
      isAdmin,
      'actorUid',
      setAuditEvents,
    );

    return () => {
      cancelled = true;
      unsubReq();
      unsubPol();
      unsubConsent();
      unsubRes();
      unsubAudit();
    };
  }, [user, isAdmin]);

  const handleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const currentNav = NAV_ITEMS.find((n) => n.key === activeNav) || NAV_ITEMS[0];

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-[#3B495C]">
          <BrandMark size={28} />
          <span>Initializing DataTrust Gate...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] text-[#0F1C2E] flex flex-col justify-between p-6">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <BrandMark size={32} />
            <span className="font-display text-lg font-semibold tracking-tight text-[#0F1C2E]">
              DataTrust Gate
            </span>
          </div>
          <span className="font-mono-tabular text-xs font-medium text-[#1F6E72]">
            {MVP_LABEL}
          </span>
        </div>

        <main className="max-w-lg w-full mx-auto bg-white border border-[#E2E0D8] rounded-lg p-8 space-y-6 my-12">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <h1 className="font-display text-xl font-semibold text-[#0F1C2E]">
                Community-Governed Health Data Access
              </h1>
              <p className="text-xs text-[#647182] mt-0.5">
                Open-source governance prototype · Deterministic policy engine
              </p>
            </div>
          </div>

          <p className="text-sm text-[#3B495C] leading-relaxed">
            Sign in with Google to inspect synthetic access requests across Nigerian research
            consortia, evaluate requests against community policies, verify synthetic consent
            references, and review the application-level audit trail.
          </p>

          <div className="bg-[#F7F6F2] border border-[#E2E0D8] rounded-md p-4 space-y-1.5 text-xs text-[#3B495C]">
            <p className="font-semibold text-[#0F1C2E]">Prototype Scope & Data Notice</p>
            <p>
              All seeded datasets are synthetic. This prototype demonstrates access authorisation
              logic only and does not store, transfer, or expose real patient health records.
            </p>
          </div>

          {authError && (
            <div className="bg-[#FBEEEE] border border-[#E5BABA] text-[#9E2A2B] px-3 py-2.5 rounded text-xs">
              {authError}
            </div>
          )}

          <button
            type="button"
            disabled={signingIn}
            onClick={handleSignIn}
            className="w-full py-2.5 px-4 bg-[#0F1C2E] text-white text-sm font-medium rounded-md hover:bg-[#1A2D47] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {signingIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </main>

        <footer className="max-w-7xl w-full mx-auto text-center text-xs text-[#647182]">
          DataTrust Gate v0.1.0 · {MVP_LABEL} · Synthetic Demonstration Environment
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#0F1C2E] flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-[260px] shrink-0 bg-[#493526] text-white border-r border-[#5E4533] min-h-screen">
        <div className="px-5 py-5 border-b border-[#5E4533] flex items-center gap-3">
          <BrandMark size={34} />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold tracking-tight text-white truncate">
              DataTrust Gate
            </p>
            <p className="font-mono-tabular text-[11px] text-[#E6D8C8]">
              {MVP_LABEL}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === 'requests') setRequestsFilterHint('ALL');
                  setActiveNav(item.key);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#674C38] text-white ring-1 ring-[#D4B99E]/40'
                    : 'text-[#F5EFE9] hover:bg-[#5A4230] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {active && (
                  <span
                    className="w-1.5 h-4 rounded-xs bg-[#E6D8C8] shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-[#5E4533] text-[11px] text-[#DECFC0] space-y-1">
          <div className="flex items-center gap-2 text-[#F5EFE9] font-medium">
            <Activity className="w-3.5 h-3.5" />
            <span>Cloud Firestore Persisted</span>
          </div>
          <p className="leading-snug">
            Synthetic governance prototype · Pre-HDC consent boundary
          </p>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#2C1F16]/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-[260px] bg-[#493526] text-white flex flex-col min-h-screen">
            <div className="px-5 py-4 border-b border-[#5E4533] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandMark size={28} />
                <span className="font-display text-sm font-semibold text-white">DataTrust Gate</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-[#E6D8C8] hover:text-white cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveNav(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-xs font-medium cursor-pointer ${
                      active
                        ? 'bg-[#674C38] text-white ring-1 ring-[#D4B99E]/40'
                        : 'text-[#F5EFE9] hover:bg-[#5A4230] hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {active && (
                      <span
                        className="w-1.5 h-4 rounded-xs bg-[#E6D8C8] shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-[#E2E0D8] px-5 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 border border-[#E2E0D8] rounded text-[#0F1C2E] cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold text-[#0F1C2E] truncate">
                {currentNav.label}
              </h1>
              <p className="text-xs text-[#647182] truncate">
                {currentNav.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <span className="hidden sm:inline font-mono-tabular text-xs font-medium text-[#1F6E72] whitespace-nowrap">
              {MVP_LABEL}
            </span>

            <div className="flex items-center gap-3 pl-4 border-l border-[#E2E0D8]">
              <div className="hidden md:block text-right">
                <p className="text-xs font-medium text-[#0F1C2E] max-w-[180px] truncate">
                  {user.displayName || user.email}
                </p>
                <p className="text-[11px] text-[#647182]">
                  {isAdmin ? 'Governance Admin' : 'Reviewer'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-1.5 text-xs font-medium border border-[#E2E0D8] rounded-md text-[#3B495C] hover:bg-[#F7F6F2] transition-colors cursor-pointer whitespace-nowrap"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 lg:p-8 max-w-[1440px] w-full mx-auto space-y-5">
          {seeding && accessRequests.length === 0 && (
            <div className="bg-white border border-[#E2E0D8] rounded-lg p-4 text-xs text-[#3B495C]">
              Initializing synthetic governance dataset in Cloud Firestore...
            </div>
          )}

          {seedError && (
            <div className="bg-[#FBEEEE] border border-[#E5BABA] text-[#9E2A2B] rounded-lg p-4 text-xs">
              Seed diagnostic: {seedError}
            </div>
          )}

          {activeNav === 'overview' && (
            <OverviewView
              requests={accessRequests}
              policies={policies}
              onNavigateToRequests={(filter = 'ALL') => {
                setRequestsFilterHint(filter);
                setActiveNav('requests');
              }}
              onInspectRequest={(req) => {
                setSelectedRequest(req);
                setActiveNav('requests');
              }}
            />
          )}

          {activeNav === 'requests' && (
            <AccessRequestsView
              key={requestsFilterHint}
              user={user}
              requests={accessRequests}
              researchers={researchers}
              policies={policies}
              consentReferences={consentReferences}
              initialStatusFilter={requestsFilterHint}
              selectedRequest={selectedRequest}
              onSelectRequest={setSelectedRequest}
            />
          )}

          {activeNav === 'policies' && (
            <PolicyManagementView
              user={user}
              isAdmin={isAdmin}
              policies={policies}
            />
          )}

          {activeNav === 'governance' && (
            <DataGovernanceView
              consentReferences={consentReferences}
              researchers={researchers}
            />
          )}

          {activeNav === 'audit' && <AuditTrailView events={auditEvents} />}

          {activeNav === 'settings' && (
            <SettingsView user={user} isAdmin={isAdmin} policies={policies} />
          )}
        </main>
      </div>
    </div>
  );
}
