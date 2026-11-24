import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  Unsubscribe,
  where,
  writeBatch,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { buildSyntheticSeedBundle } from '../data/syntheticSeed.ts';
import {
  APP_VERSION,
  AccessRequest,
  AuditEvent,
  ConsentReference,
  DataCategory,
  GovernancePolicy,
  ResearchPurpose,
  Researcher,
  SystemMeta,
} from '../types/governance.ts';
import { InMemoryConsentVerifier, evaluateAccessRequest } from './policyEngine.ts';

function generateDocId(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export async function seedSyntheticDataIfEmpty(user: User): Promise<boolean> {
  const seedMarkerRef = doc(db, 'systemMeta', 'seedState');
  let markerSnap;
  try {
    markerSnap = await getDoc(seedMarkerRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'systemMeta/seedState');
  }

  if (markerSnap.exists()) {
    return false;
  }

  const actorLabel = user.email || user.displayName || user.uid;
  const bundle = await buildSyntheticSeedBundle(user.uid, actorLabel);

  // Batch writes (max 450 operations per batch for safety)
  const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
  for (const r of bundle.researchers) {
    ops.push({ ref: doc(db, 'researchers', r.researcherId), data: r as unknown as Record<string, unknown> });
  }
  for (const p of bundle.policies) {
    ops.push({ ref: doc(db, 'governancePolicies', p.policyId), data: p as unknown as Record<string, unknown> });
  }
  for (const c of bundle.consentReferences) {
    ops.push({ ref: doc(db, 'consentReferences', c.consentReferenceId), data: c as unknown as Record<string, unknown> });
  }
  for (const req of bundle.accessRequests) {
    ops.push({ ref: doc(db, 'accessRequests', req.requestId), data: req as unknown as Record<string, unknown> });
  }
  for (const evt of bundle.auditEvents) {
    ops.push({ ref: doc(db, 'auditEvents', evt.eventId), data: evt as unknown as Record<string, unknown> });
  }

  const meta: SystemMeta = {
    seeded: true,
    seededAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    seededByUid: user.uid,
  };
  ops.push({ ref: seedMarkerRef, data: meta as unknown as Record<string, unknown> });

  const CHUNK_SIZE = 400;
  try {
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      const slice = ops.slice(i, i + CHUNK_SIZE);
      for (const item of slice) {
        batch.set(item.ref, item.data);
      }
      await batch.commit();
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'systemMeta/seedState');
  }
}

export async function resetSyntheticData(user: User): Promise<void> {
  const collectionsToReset = [
    'researchers',
    'governancePolicies',
    'consentReferences',
    'accessRequests',
  ] as const;

  for (const colName of collectionsToReset) {
    try {
      const q = query(collection(db, colName), where('isSynthetic', '==', true));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, colName, docSnap.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, colName);
    }
  }

  const actorLabel = user.email || user.displayName || user.uid;
  const bundle = await buildSyntheticSeedBundle(user.uid, actorLabel);

  const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
  for (const r of bundle.researchers) {
    ops.push({ ref: doc(db, 'researchers', r.researcherId), data: r as unknown as Record<string, unknown> });
  }
  for (const p of bundle.policies) {
    ops.push({ ref: doc(db, 'governancePolicies', p.policyId), data: p as unknown as Record<string, unknown> });
  }
  for (const c of bundle.consentReferences) {
    ops.push({ ref: doc(db, 'consentReferences', c.consentReferenceId), data: c as unknown as Record<string, unknown> });
  }
  for (const req of bundle.accessRequests) {
    ops.push({ ref: doc(db, 'accessRequests', req.requestId), data: req as unknown as Record<string, unknown> });
  }

  const resetEvent: AuditEvent = {
    eventId: generateDocId('EVT-RESET'),
    requestId: '',
    eventType: 'POLICY_CREATED',
    timestamp: new Date().toISOString(),
    actor: actorLabel,
    actorUid: user.uid,
    decision: 'SYNTHETIC_RESET',
    explanation: 'Administrator confirmed reset of synthetic demonstration dataset (non-synthetic records and audit trail preserved).',
    policyReferences: bundle.policies.map((p) => p.policyId).slice(0, 5),
    isSynthetic: false,
  };
  ops.push({ ref: doc(db, 'auditEvents', resetEvent.eventId), data: resetEvent as unknown as Record<string, unknown> });

  const meta: SystemMeta = {
    seeded: true,
    seededAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    seededByUid: user.uid,
  };
  ops.push({ ref: doc(db, 'systemMeta', 'seedState'), data: meta as unknown as Record<string, unknown> });

  const CHUNK_SIZE = 400;
  try {
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      const slice = ops.slice(i, i + CHUNK_SIZE);
      for (const item of slice) {
        batch.set(item.ref, item.data);
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'resetSyntheticData');
  }
}

export function subscribeCollectionWithAccess<T extends object>(
  collectionName: string,
  idField: keyof T,
  user: User,
  isAdmin: boolean,
  ownUidField: string | null,
  onData: (items: T[]) => void,
): Unsubscribe {
  const colRef = collection(db, collectionName);

  if (isAdmin) {
    return onSnapshot(
      colRef,
      (snapshot) => {
        onData(snapshot.docs.map((d) => d.data() as T));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionName);
      },
    );
  }

  let syntheticItems: T[] = [];
  let ownItems: T[] = [];

  const emitMerged = () => {
    const merged = new Map<string, T>();
    for (const item of syntheticItems) {
      merged.set(String(item[idField]), item);
    }
    for (const item of ownItems) {
      merged.set(String(item[idField]), item);
    }
    onData(Array.from(merged.values()));
  };

  const unsubSynth = onSnapshot(
    query(colRef, where('isSynthetic', '==', true)),
    (snapshot) => {
      syntheticItems = snapshot.docs.map((d) => d.data() as T);
      emitMerged();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    },
  );

  let unsubOwn: Unsubscribe | null = null;
  if (ownUidField) {
    unsubOwn = onSnapshot(
      query(colRef, where(ownUidField, '==', user.uid)),
      (snapshot) => {
        ownItems = snapshot.docs.map((d) => d.data() as T);
        emitMerged();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionName);
      },
    );
  }

  return () => {
    unsubSynth();
    if (unsubOwn) unsubOwn();
  };
}

export interface CreateRequestPayload {
  researcherId: string;
  organisation: string;
  country: string;
  stateOrRegion: string;
  dataCategory: DataCategory;
  purpose: ResearchPurpose;
  requestedDurationDays: number;
  consentReferenceId: string;
}

export async function createAccessRequest(
  user: User,
  payload: CreateRequestPayload,
): Promise<AccessRequest> {
  const now = new Date().toISOString();
  const requestId = generateDocId('REQ');
  const actorLabel = user.email || user.displayName || user.uid;

  const newRequest: AccessRequest = {
    requestId,
    researcherId: payload.researcherId.trim(),
    organisation: payload.organisation.trim(),
    country: payload.country.trim() || 'Nigeria',
    stateOrRegion: payload.stateOrRegion.trim(),
    dataCategory: payload.dataCategory,
    purpose: payload.purpose,
    requestedDurationDays: Math.floor(Number(payload.requestedDurationDays)),
    consentReferenceId: payload.consentReferenceId.trim(),
    submittedAt: now,
    evaluatedAt: '',
    decisionStatus: 'PENDING',
    decisionExplanation: 'Submitted and awaiting deterministic policy evaluation.',
    evaluatedConditions: [],
    matchedPolicyIds: [],
    policyCompliant: false,
    submittedByUid: user.uid,
    isSynthetic: false,
  };

  try {
    await setDoc(doc(db, 'accessRequests', requestId), newRequest);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `accessRequests/${requestId}`);
  }

  const auditEvt: AuditEvent = {
    eventId: generateDocId('EVT'),
    requestId,
    eventType: 'ACCESS_REQUEST_SUBMITTED',
    timestamp: now,
    actor: actorLabel,
    actorUid: user.uid,
    decision: 'PENDING',
    explanation: `Submitted access request ${requestId} for ${newRequest.dataCategory} (${newRequest.purpose}) by ${newRequest.organisation}.`,
    policyReferences: [],
    isSynthetic: false,
  };

  try {
    await setDoc(doc(db, 'auditEvents', auditEvt.eventId), auditEvt);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `auditEvents/${auditEvt.eventId}`);
  }

  return newRequest;
}

export async function evaluateRequestAndPersist(
  user: User,
  request: AccessRequest,
  researchers: Researcher[],
  policies: GovernancePolicy[],
  consentReferences: ConsentReference[],
): Promise<AccessRequest> {
  const actorLabel = user.email || user.displayName || user.uid;
  const researcher = researchers.find((r) => r.researcherId === request.researcherId);

  // Also call the server-side deterministic evaluation endpoint when available
  let outcome;
  try {
    const token = await user.getIdToken();
    const resp = await fetch('/api/v1/engine/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        request,
        researcher,
        policies,
        consentReferences,
      }),
    });
    if (resp.ok) {
      const json = await resp.json();
      outcome = json.data;
    }
  } catch {
    // Fallback to identical local deterministic engine if network interrupted
  }

  if (!outcome) {
    const consentVerifier = new InMemoryConsentVerifier(consentReferences);
    outcome = await evaluateAccessRequest({
      request,
      researcher,
      policies,
      consentVerifier,
    });
  }

  const reqPath = `accessRequests/${request.requestId}`;
  try {
    await updateDoc(doc(db, 'accessRequests', request.requestId), {
      decisionStatus: outcome.decisionStatus,
      decisionExplanation: outcome.decisionExplanation,
      evaluatedConditions: outcome.evaluatedConditions,
      matchedPolicyIds: outcome.matchedPolicyIds,
      policyCompliant: outcome.policyCompliant,
      evaluatedAt: outcome.evaluatedAt,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, reqPath);
  }

  const eventsToAppend: AuditEvent[] = [];

  if (outcome.consentCheck?.checked) {
    eventsToAppend.push({
      eventId: generateDocId('EVT-CHK'),
      requestId: request.requestId,
      eventType: 'CONSENT_REFERENCE_CHECKED',
      timestamp: outcome.evaluatedAt,
      actor: 'DataTrust Policy Engine',
      actorUid: user.uid,
      decision: outcome.consentCheck.status,
      explanation: outcome.consentCheck.reason,
      policyReferences: outcome.matchedPolicyIds,
      isSynthetic: false,
    });
  }

  eventsToAppend.push({
    eventId: generateDocId('EVT-EVL'),
    requestId: request.requestId,
    eventType: 'ACCESS_REQUEST_EVALUATED',
    timestamp: outcome.evaluatedAt,
    actor: 'DataTrust Policy Engine',
    actorUid: user.uid,
    decision: outcome.decisionStatus,
    explanation: outcome.decisionExplanation,
    policyReferences: outcome.matchedPolicyIds,
    isSynthetic: false,
  });

  eventsToAppend.push({
    eventId: generateDocId('EVT-DEC'),
    requestId: request.requestId,
    eventType: 'ACCESS_DECISION_RECORDED',
    timestamp: outcome.evaluatedAt,
    actor: actorLabel,
    actorUid: user.uid,
    decision: outcome.decisionStatus,
    explanation: `Governance decision ${outcome.decisionStatus} persisted for request ${request.requestId}.`,
    policyReferences: outcome.matchedPolicyIds,
    isSynthetic: false,
  });

  try {
    const batch = writeBatch(db);
    for (const evt of eventsToAppend) {
      batch.set(doc(db, 'auditEvents', evt.eventId), evt);
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'auditEvents');
  }

  return {
    ...request,
    decisionStatus: outcome.decisionStatus,
    decisionExplanation: outcome.decisionExplanation,
    evaluatedConditions: outcome.evaluatedConditions,
    matchedPolicyIds: outcome.matchedPolicyIds,
    policyCompliant: outcome.policyCompliant,
    evaluatedAt: outcome.evaluatedAt,
  };
}

export interface CreatePolicyPayload {
  policyName: string;
  description: string;
  permittedOrganisations: string[];
  permittedPurposes: string[];
  permittedDataCategories: string[];
  maxDurationDays: number;
  requiresConsent: boolean;
  communityRestrictionNote: string;
}

export async function createGovernancePolicy(
  user: User,
  payload: CreatePolicyPayload,
): Promise<GovernancePolicy> {
  const now = new Date().toISOString();
  const policyId = generateDocId('POL');
  const actorLabel = user.email || user.displayName || user.uid;

  const newPolicy: GovernancePolicy = {
    policyId,
    policyName: payload.policyName.trim(),
    description: payload.description.trim(),
    permittedOrganisations: payload.permittedOrganisations.length > 0 ? payload.permittedOrganisations : ['*'],
    permittedPurposes: payload.permittedPurposes,
    permittedDataCategories: payload.permittedDataCategories,
    maxDurationDays: Math.floor(Number(payload.maxDurationDays)),
    requiresConsent: payload.requiresConsent,
    communityRestrictionNote: payload.communityRestrictionNote.trim() || 'Standard community governance conditions apply.',
    status: 'ACTIVE',
    createdAt: now,
    createdByUid: user.uid,
    isSynthetic: false,
  };

  try {
    await setDoc(doc(db, 'governancePolicies', policyId), newPolicy);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `governancePolicies/${policyId}`);
  }

  const evt: AuditEvent = {
    eventId: generateDocId('EVT-POL'),
    requestId: '',
    eventType: 'POLICY_CREATED',
    timestamp: now,
    actor: actorLabel,
    actorUid: user.uid,
    decision: 'ACTIVE',
    explanation: `Created governance policy ${policyId}: ${newPolicy.policyName}.`,
    policyReferences: [policyId],
    isSynthetic: false,
  };

  try {
    await setDoc(doc(db, 'auditEvents', evt.eventId), evt);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `auditEvents/${evt.eventId}`);
  }

  return newPolicy;
}

export async function updateGovernancePolicyStatus(
  user: User,
  policy: GovernancePolicy,
  nextStatus: 'ACTIVE' | 'INACTIVE',
): Promise<void> {
  const actorLabel = user.email || user.displayName || user.uid;
  const now = new Date().toISOString();

  try {
    await updateDoc(doc(db, 'governancePolicies', policy.policyId), {
      status: nextStatus,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `governancePolicies/${policy.policyId}`);
  }

  const evt: AuditEvent = {
    eventId: generateDocId('EVT-POL'),
    requestId: '',
    eventType: nextStatus === 'INACTIVE' ? 'POLICY_DEACTIVATED' : 'POLICY_CREATED',
    timestamp: now,
    actor: actorLabel,
    actorUid: user.uid,
    decision: nextStatus,
    explanation: `${nextStatus === 'INACTIVE' ? 'Deactivated' : 'Reactivated'} governance policy ${policy.policyId} (${policy.policyName}).`,
    policyReferences: [policy.policyId],
    isSynthetic: false,
  };

  try {
    await setDoc(doc(db, 'auditEvents', evt.eventId), evt);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `auditEvents/${evt.eventId}`);
  }
}
