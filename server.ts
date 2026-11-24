import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  APP_VERSION,
  type AccessRequest,
  type AuditEvent,
  type ConsentReference,
  type GovernancePolicy,
  MVP_LABEL,
  type Researcher,
  isValidDataCategoryValue,
  isValidEntityId,
  isValidPurposeValue,
} from './src/types/governance.ts';
import {
  InMemoryConsentVerifier,
  evaluateAccessRequest,
} from './src/services/policyEngine.ts';
import {
  computeActivityTimeline,
  computeComplianceMetrics,
  computeDashboardSummary,
  computeDecisionDistribution,
  computeGeographyMetrics,
} from './src/services/analytics.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
const firebaseConfig: FirebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;

// --- Firestore REST Value Marshalling ---
type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } }
  | { nullValue: null };

function decodeFsValue(val: FsValue | undefined): unknown {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(decodeFsValue);
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      out[k] = decodeFsValue(v);
    }
    return out;
  }
  return null;
}

function encodeFsValue(val: unknown): FsValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(encodeFsValue) } };
  if (typeof val === 'object') {
    const fields: Record<string, FsValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = encodeFsValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function decodeFsDocument<T>(docObj: { fields?: Record<string, FsValue> }): T {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(docObj.fields || {})) {
    result[k] = decodeFsValue(v);
  }
  return result as T;
}

function encodeFsFields(obj: Record<string, unknown>): Record<string, FsValue> {
  const fields: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = encodeFsValue(v);
  }
  return fields;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 20 ? token : null;
}

function decodeTokenClaims(token: string): { uid: string; email: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { uid: '', email: '' };
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as Record<string, unknown>;
    const uid = typeof payload.user_id === 'string' ? payload.user_id : typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    return { uid, email };
  } catch {
    return { uid: '', email: '' };
  }
}

async function queryFirestoreCollection<T>(
  collectionId: string,
  token: string,
  uidField?: string,
  uidValue?: string,
): Promise<{ status: number; data?: T[]; error?: string }> {
  const runSingleQuery = async (filterField?: string, filterVal?: FsValue) => {
    const structuredQuery: Record<string, unknown> = {
      from: [{ collectionId }],
    };
    if (filterField && filterVal) {
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: filterField },
          op: 'EQUAL',
          value: filterVal,
        },
      };
    }

    const resp = await fetch(`${FIRESTORE_BASE}:runQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ structuredQuery }),
    });
    return resp;
  };

  // Query synthetic records first (allowed by firestore.rules for all verified users)
  const synthResp = await runSingleQuery('isSynthetic', { booleanValue: true });
  if (!synthResp.ok) {
    const errText = await synthResp.text();
    return { status: synthResp.status, error: errText };
  }
  const synthRows = (await synthResp.json()) as Array<{ document?: { name: string; fields?: Record<string, FsValue> } }>;
  const merged = new Map<string, T>();
  for (const row of synthRows) {
    if (row.document?.fields) {
      merged.set(row.document.name, decodeFsDocument<T>(row.document));
    }
  }

  // Also query caller-owned non-synthetic records when applicable
  if (uidField && uidValue) {
    const ownResp = await runSingleQuery(uidField, { stringValue: uidValue });
    if (ownResp.ok) {
      const ownRows = (await ownResp.json()) as Array<{ document?: { name: string; fields?: Record<string, FsValue> } }>;
      for (const row of ownRows) {
        if (row.document?.fields) {
          merged.set(row.document.name, decodeFsDocument<T>(row.document));
        }
      }
    }
  }

  return { status: 200, data: Array.from(merged.values()) };
}

async function getFirestoreDoc<T>(
  collectionId: string,
  docId: string,
  token: string,
): Promise<{ status: number; data?: T; error?: string }> {
  const resp = await fetch(`${FIRESTORE_BASE}/${encodeURIComponent(collectionId)}/${encodeURIComponent(docId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    return { status: resp.status, error: await resp.text() };
  }
  const json = (await resp.json()) as { fields?: Record<string, FsValue> };
  return { status: 200, data: decodeFsDocument<T>(json) };
}

async function createFirestoreDoc(
  collectionId: string,
  docId: string,
  data: Record<string, unknown>,
  token: string,
): Promise<{ status: number; error?: string }> {
  const url = `${FIRESTORE_BASE}/${encodeURIComponent(collectionId)}?documentId=${encodeURIComponent(docId)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields: encodeFsFields(data) }),
  });
  if (!resp.ok) {
    return { status: resp.status, error: await resp.text() };
  }
  return { status: 201 };
}

async function patchFirestoreDoc(
  collectionId: string,
  docId: string,
  updates: Record<string, unknown>,
  token: string,
): Promise<{ status: number; error?: string }> {
  const maskParams = Object.keys(updates)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  const url = `${FIRESTORE_BASE}/${encodeURIComponent(collectionId)}/${encodeURIComponent(docId)}?${maskParams}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields: encodeFsFields(updates) }),
  });
  if (!resp.ok) {
    return { status: resp.status, error: await resp.text() };
  }
  return { status: 200 };
}

function generateId(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // 1. Health endpoint
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'DataTrust Gate API',
      version: APP_VERSION,
      mvpLabel: MVP_LABEL,
      persistenceMode: 'Cloud Firestore (Starter Tier Rules-Enforced)',
      hdcIntegrationStatus: 'Synthetic consent references (pre-HDC adapter)',
      timestamp: new Date().toISOString(),
    });
  });

  // Stateless evaluation engine endpoint
  app.post('/api/v1/engine/evaluate', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        request?: AccessRequest;
        researcher?: Researcher;
        policies?: GovernancePolicy[];
        consentReferences?: ConsentReference[];
      };

      if (!body?.request || !Array.isArray(body?.policies) || !Array.isArray(body?.consentReferences)) {
        res.status(400).json({
          ok: false,
          error: 'Invalid payload. Required fields: request, policies[], consentReferences[].',
        });
        return;
      }

      const consentVerifier = new InMemoryConsentVerifier(body.consentReferences);
      const outcome = await evaluateAccessRequest({
        request: body.request,
        researcher: body.researcher,
        policies: body.policies,
        consentVerifier,
      });

      res.json({ ok: true, data: outcome });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Deterministic evaluation failed.',
      });
    }
  });

  // Helper to require Firebase Auth Bearer token on Firestore-backed REST endpoints
  const requireToken = (req: Request, res: Response): { token: string; uid: string; email: string } | null => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({
        ok: false,
        error: 'Authentication required. Include a Firebase Auth ID token in Authorization: Bearer <token>.',
      });
      return null;
    }
    const claims = decodeTokenClaims(token);
    if (!claims.uid) {
      res.status(401).json({ ok: false, error: 'Malformed Bearer token.' });
      return null;
    }
    return { token, ...claims };
  };

  // Dashboard endpoints
  app.get('/api/v1/dashboard/summary', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const result = await queryFirestoreCollection<AccessRequest>('accessRequests', authCtx.token, 'submittedByUid', authCtx.uid);
    if (result.status !== 200 || !result.data) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, data: computeDashboardSummary(result.data) });
  });

  app.get('/api/v1/dashboard/geography', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const result = await queryFirestoreCollection<AccessRequest>('accessRequests', authCtx.token, 'submittedByUid', authCtx.uid);
    if (result.status !== 200 || !result.data) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({
      ok: true,
      note: 'Illustrative synthetic geographic data. Actual researcher locations are not inferred.',
      data: computeGeographyMetrics(result.data),
    });
  });

  app.get('/api/v1/dashboard/decisions', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const result = await queryFirestoreCollection<AccessRequest>('accessRequests', authCtx.token, 'submittedByUid', authCtx.uid);
    if (result.status !== 200 || !result.data) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, data: computeDecisionDistribution(result.data) });
  });

  app.get('/api/v1/dashboard/compliance', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const result = await queryFirestoreCollection<AccessRequest>('accessRequests', authCtx.token, 'submittedByUid', authCtx.uid);
    if (result.status !== 200 || !result.data) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, data: computeComplianceMetrics(result.data) });
  });

  app.get('/api/v1/dashboard/activity', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const granularity = req.query.granularity === 'daily' ? 'daily' : 'weekly';
    const result = await queryFirestoreCollection<AccessRequest>('accessRequests', authCtx.token, 'submittedByUid', authCtx.uid);
    if (result.status !== 200 || !result.data) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, granularity, data: computeActivityTimeline(result.data, granularity) });
  });

  // Access Requests REST endpoints
  app.get('/api/v1/requests', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const result = await queryFirestoreCollection<AccessRequest>('accessRequests', authCtx.token, 'submittedByUid', authCtx.uid);
    if (result.status !== 200 || !result.data) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    let list = result.data;
    const { status, purpose, q } = req.query;
    if (typeof status === 'string' && status !== 'ALL') {
      list = list.filter((r) => r.decisionStatus === status);
    }
    if (typeof purpose === 'string' && purpose !== 'ALL') {
      list = list.filter((r) => r.purpose === purpose);
    }
    if (typeof q === 'string' && q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.requestId.toLowerCase().includes(needle) ||
          r.researcherId.toLowerCase().includes(needle) ||
          r.organisation.toLowerCase().includes(needle),
      );
    }
    list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    res.json({ ok: true, data: list });
  });

  app.get('/api/v1/requests/:id', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const id = req.params.id;
    if (!isValidEntityId(id)) {
      res.status(400).json({ ok: false, error: 'Invalid request ID format.' });
      return;
    }
    const result = await getFirestoreDoc<AccessRequest>('accessRequests', id, authCtx.token);
    if (result.status !== 200 || !result.data) {
      res.status(result.status === 404 ? 404 : result.status).json({ ok: false, error: result.error || 'Not found' });
      return;
    }
    res.json({ ok: true, data: result.data });
  });

  app.post('/api/v1/requests', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;

    const body = req.body as Record<string, unknown>;
    if (
      !isValidEntityId(body.researcherId) ||
      typeof body.organisation !== 'string' ||
      body.organisation.trim().length < 2 ||
      typeof body.stateOrRegion !== 'string' ||
      body.stateOrRegion.trim().length < 2 ||
      !isValidDataCategoryValue(body.dataCategory) ||
      !isValidPurposeValue(body.purpose)
    ) {
      res.status(400).json({
        ok: false,
        error: 'Validation failed: verify researcherId, organisation, stateOrRegion, dataCategory, and purpose.',
      });
      return;
    }

    const duration = Number(body.requestedDurationDays);
    if (!Number.isInteger(duration) || duration < 1 || duration > 1095) {
      res.status(400).json({ ok: false, error: 'requestedDurationDays must be an integer between 1 and 1095.' });
      return;
    }

    // Prevent callers from submitting self-approved decisions
    const now = new Date().toISOString();
    const requestId = generateId('REQ');
    const newReq: AccessRequest = {
      requestId,
      researcherId: body.researcherId.trim(),
      organisation: body.organisation.trim(),
      country: typeof body.country === 'string' && body.country.trim() ? body.country.trim() : 'Nigeria',
      stateOrRegion: body.stateOrRegion.trim(),
      dataCategory: body.dataCategory,
      purpose: body.purpose,
      requestedDurationDays: duration,
      consentReferenceId: typeof body.consentReferenceId === 'string' ? body.consentReferenceId.trim() : '',
      submittedAt: now,
      evaluatedAt: '',
      decisionStatus: 'PENDING',
      decisionExplanation: 'Submitted and awaiting deterministic policy evaluation.',
      evaluatedConditions: [],
      matchedPolicyIds: [],
      policyCompliant: false,
      submittedByUid: authCtx.uid,
      isSynthetic: false,
    };

    const createRes = await createFirestoreDoc('accessRequests', requestId, newReq as unknown as Record<string, unknown>, authCtx.token);
    if (createRes.status !== 201) {
      res.status(createRes.status).json({ ok: false, error: createRes.error });
      return;
    }

    const auditEvt: AuditEvent = {
      eventId: generateId('EVT'),
      requestId,
      eventType: 'ACCESS_REQUEST_SUBMITTED',
      timestamp: now,
      actor: authCtx.email || authCtx.uid,
      actorUid: authCtx.uid,
      decision: 'PENDING',
      explanation: `Submitted access request ${requestId} via REST API.`,
      policyReferences: [],
      isSynthetic: false,
    };
    await createFirestoreDoc('auditEvents', auditEvt.eventId, auditEvt as unknown as Record<string, unknown>, authCtx.token);

    res.status(201).json({ ok: true, data: newReq });
  });

  app.post('/api/v1/requests/:id/evaluate', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const id = req.params.id;
    if (!isValidEntityId(id)) {
      res.status(400).json({ ok: false, error: 'Invalid request ID format.' });
      return;
    }

    const reqDoc = await getFirestoreDoc<AccessRequest>('accessRequests', id, authCtx.token);
    if (reqDoc.status !== 200 || !reqDoc.data) {
      res.status(reqDoc.status).json({ ok: false, error: reqDoc.error || 'Access request not found.' });
      return;
    }

    const [policiesRes, consentsRes, researchersRes] = await Promise.all([
      queryFirestoreCollection<GovernancePolicy>('governancePolicies', authCtx.token, 'createdByUid', authCtx.uid),
      queryFirestoreCollection<ConsentReference>('consentReferences', authCtx.token, 'createdByUid', authCtx.uid),
      queryFirestoreCollection<Researcher>('researchers', authCtx.token, 'createdByUid', authCtx.uid),
    ]);

    if (policiesRes.status !== 200 || consentsRes.status !== 200 || researchersRes.status !== 200) {
      res.status(500).json({ ok: false, error: 'Failed to load governance policies or consent references.' });
      return;
    }

    const researcher = (researchersRes.data || []).find((r) => r.researcherId === reqDoc.data!.researcherId);
    const consentVerifier = new InMemoryConsentVerifier(consentsRes.data || []);
    const outcome = await evaluateAccessRequest({
      request: reqDoc.data,
      researcher,
      policies: policiesRes.data || [],
      consentVerifier,
    });

    const patchRes = await patchFirestoreDoc(
      'accessRequests',
      id,
      {
        decisionStatus: outcome.decisionStatus,
        decisionExplanation: outcome.decisionExplanation,
        evaluatedConditions: outcome.evaluatedConditions,
        matchedPolicyIds: outcome.matchedPolicyIds,
        policyCompliant: outcome.policyCompliant,
        evaluatedAt: outcome.evaluatedAt,
      },
      authCtx.token,
    );

    if (patchRes.status !== 200) {
      res.status(patchRes.status).json({ ok: false, error: patchRes.error });
      return;
    }

    if (outcome.consentCheck.checked) {
      const chkEvt: AuditEvent = {
        eventId: generateId('EVT-CHK'),
        requestId: id,
        eventType: 'CONSENT_REFERENCE_CHECKED',
        timestamp: outcome.evaluatedAt,
        actor: 'DataTrust Policy Engine',
        actorUid: authCtx.uid,
        decision: outcome.consentCheck.status,
        explanation: outcome.consentCheck.reason,
        policyReferences: outcome.matchedPolicyIds,
        isSynthetic: false,
      };
      await createFirestoreDoc('auditEvents', chkEvt.eventId, chkEvt as unknown as Record<string, unknown>, authCtx.token);
    }

    const evalEvt: AuditEvent = {
      eventId: generateId('EVT-EVL'),
      requestId: id,
      eventType: 'ACCESS_REQUEST_EVALUATED',
      timestamp: outcome.evaluatedAt,
      actor: 'DataTrust Policy Engine',
      actorUid: authCtx.uid,
      decision: outcome.decisionStatus,
      explanation: outcome.decisionExplanation,
      policyReferences: outcome.matchedPolicyIds,
      isSynthetic: false,
    };
    await createFirestoreDoc('auditEvents', evalEvt.eventId, evalEvt as unknown as Record<string, unknown>, authCtx.token);

    const decEvt: AuditEvent = {
      eventId: generateId('EVT-DEC'),
      requestId: id,
      eventType: 'ACCESS_DECISION_RECORDED',
      timestamp: outcome.evaluatedAt,
      actor: authCtx.email || authCtx.uid,
      actorUid: authCtx.uid,
      decision: outcome.decisionStatus,
      explanation: `Recorded decision ${outcome.decisionStatus} for ${id} via REST API.`,
      policyReferences: outcome.matchedPolicyIds,
      isSynthetic: false,
    };
    await createFirestoreDoc('auditEvents', decEvt.eventId, decEvt as unknown as Record<string, unknown>, authCtx.token);

    res.json({
      ok: true,
      data: {
        ...reqDoc.data,
        decisionStatus: outcome.decisionStatus,
        decisionExplanation: outcome.decisionExplanation,
        evaluatedConditions: outcome.evaluatedConditions,
        matchedPolicyIds: outcome.matchedPolicyIds,
        policyCompliant: outcome.policyCompliant,
        evaluatedAt: outcome.evaluatedAt,
      },
    });
  });

  // Policy endpoints
  app.get('/api/v1/policies', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const result = await queryFirestoreCollection<GovernancePolicy>('governancePolicies', authCtx.token, 'createdByUid', authCtx.uid);
    if (result.status !== 200 || !result.data) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, data: result.data.sort((a, b) => a.policyId.localeCompare(b.policyId)) });
  });

  app.post('/api/v1/policies', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const body = req.body as Record<string, unknown>;
    if (
      typeof body.policyName !== 'string' ||
      body.policyName.trim().length < 3 ||
      !Array.isArray(body.permittedPurposes) ||
      body.permittedPurposes.length === 0 ||
      !Array.isArray(body.permittedDataCategories) ||
      body.permittedDataCategories.length === 0
    ) {
      res.status(400).json({ ok: false, error: 'Invalid policy payload.' });
      return;
    }

    const maxDurationDays = Number(body.maxDurationDays);
    if (!Number.isInteger(maxDurationDays) || maxDurationDays < 1 || maxDurationDays > 1095) {
      res.status(400).json({ ok: false, error: 'maxDurationDays must be between 1 and 1095.' });
      return;
    }

    const now = new Date().toISOString();
    const policyId = generateId('POL');
    const policy: GovernancePolicy = {
      policyId,
      policyName: body.policyName.trim(),
      description: typeof body.description === 'string' ? body.description.trim() : '',
      permittedOrganisations:
        Array.isArray(body.permittedOrganisations) && body.permittedOrganisations.length > 0
          ? body.permittedOrganisations.map(String)
          : ['*'],
      permittedPurposes: body.permittedPurposes.map(String),
      permittedDataCategories: body.permittedDataCategories.map(String),
      maxDurationDays,
      requiresConsent: Boolean(body.requiresConsent),
      communityRestrictionNote:
        typeof body.communityRestrictionNote === 'string' ? body.communityRestrictionNote.trim() : '',
      status: 'ACTIVE',
      createdAt: now,
      createdByUid: authCtx.uid,
      isSynthetic: false,
    };

    const createRes = await createFirestoreDoc('governancePolicies', policyId, policy as unknown as Record<string, unknown>, authCtx.token);
    if (createRes.status !== 201) {
      res.status(createRes.status).json({ ok: false, error: createRes.error });
      return;
    }

    const evt: AuditEvent = {
      eventId: generateId('EVT-POL'),
      requestId: '',
      eventType: 'POLICY_CREATED',
      timestamp: now,
      actor: authCtx.email || authCtx.uid,
      actorUid: authCtx.uid,
      decision: 'ACTIVE',
      explanation: `Created policy ${policyId}: ${policy.policyName}.`,
      policyReferences: [policyId],
      isSynthetic: false,
    };
    await createFirestoreDoc('auditEvents', evt.eventId, evt as unknown as Record<string, unknown>, authCtx.token);

    res.status(201).json({ ok: true, data: policy });
  });

  app.patch('/api/v1/policies/:id', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const id = req.params.id;
    if (!isValidEntityId(id)) {
      res.status(400).json({ ok: false, error: 'Invalid policy ID format.' });
      return;
    }
    const status = (req.body as { status?: unknown })?.status;
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      res.status(400).json({ ok: false, error: 'status must be ACTIVE or INACTIVE.' });
      return;
    }

    const patchRes = await patchFirestoreDoc('governancePolicies', id, { status }, authCtx.token);
    if (patchRes.status !== 200) {
      res.status(patchRes.status).json({ ok: false, error: patchRes.error });
      return;
    }

    const evt: AuditEvent = {
      eventId: generateId('EVT-POL'),
      requestId: '',
      eventType: status === 'INACTIVE' ? 'POLICY_DEACTIVATED' : 'POLICY_CREATED',
      timestamp: new Date().toISOString(),
      actor: authCtx.email || authCtx.uid,
      actorUid: authCtx.uid,
      decision: status,
      explanation: `Updated policy ${id} status to ${status}.`,
      policyReferences: [id],
      isSynthetic: false,
    };
    await createFirestoreDoc('auditEvents', evt.eventId, evt as unknown as Record<string, unknown>, authCtx.token);

    res.json({ ok: true, data: { policyId: id, status } });
  });

  // Consent references & Audit endpoints
  app.get('/api/v1/consent-references', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const result = await queryFirestoreCollection<ConsentReference>('consentReferences', authCtx.token, 'createdByUid', authCtx.uid);
    if (result.status !== 200 || !result.data) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, data: result.data.sort((a, b) => a.consentReferenceId.localeCompare(b.consentReferenceId)) });
  });

  app.get('/api/v1/audit', async (req: Request, res: Response) => {
    const authCtx = requireToken(req, res);
    if (!authCtx) return;
    const result = await queryFirestoreCollection<AuditEvent>('auditEvents', authCtx.token, 'actorUid', authCtx.uid);
    if (result.status !== 200 || !result.data) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    let list = result.data;
    const { eventType, q } = req.query;
    if (typeof eventType === 'string' && eventType !== 'ALL') {
      list = list.filter((e) => e.eventType === eventType);
    }
    if (typeof q === 'string' && q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.eventId.toLowerCase().includes(needle) ||
          e.requestId.toLowerCase().includes(needle) ||
          e.actor.toLowerCase().includes(needle) ||
          e.explanation.toLowerCase().includes(needle),
      );
    }
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    res.json({ ok: true, data: list });
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const isProd =
    process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
      console.warn(`Warning: production build directory not found at ${distDir}`);
    }
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`DataTrust Gate listening on http://0.0.0.0:${port}`);
  });
}

if (
  process.argv[1] &&
  fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(__filename)
) {
  startServer().catch((err) => {
    console.error('Failed to start DataTrust Gate server:', err);
    process.exit(1);
  });
}
