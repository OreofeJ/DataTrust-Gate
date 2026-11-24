export const APP_VERSION = '0.1.0';
export const MVP_LABEL = 'MVP VERSION 1';
export const BOOTSTRAP_ADMIN_EMAIL = 'jardinsolicitors@gmail.com';

export const DATA_CATEGORIES = [
  'Demographic information',
  'Health records',
  'Mental-health information',
  'Genomic information',
  'Location information',
  'Survey responses',
  'Other research data',
] as const;

export type DataCategory = (typeof DATA_CATEGORIES)[number];

export const RESEARCH_PURPOSES = [
  'Academic research',
  'Mental-health research',
  'Public-health research',
  'AI model development',
  'Anonymous statistical analysis',
  'Commercial research',
] as const;

export type ResearchPurpose = (typeof RESEARCH_PURPOSES)[number];

export const DECISION_STATUSES = ['PENDING', 'APPROVED', 'DENIED', 'REVIEW'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const CONSENT_STATUSES = ['VALID', 'EXPIRED', 'REVOKED', 'PENDING'] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const POLICY_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const AUDIT_EVENT_TYPES = [
  'ACCESS_REQUEST_SUBMITTED',
  'ACCESS_REQUEST_EVALUATED',
  'POLICY_CREATED',
  'POLICY_DEACTIVATED',
  'CONSENT_REFERENCE_CHECKED',
  'ACCESS_DECISION_RECORDED',
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export const NIGERIA_STATES = [
  'Lagos',
  'FCT Abuja',
  'Oyo',
  'Kano',
  'Rivers',
  'Enugu',
  'Kaduna',
  'Ogun',
  'Edo',
  'Cross River',
  'Plateau',
  'Borno',
  'Anambra',
  'Delta',
  'Sokoto',
] as const;

export type NigeriaState = (typeof NIGERIA_STATES)[number];

export interface Researcher {
  researcherId: string;
  fullName: string;
  organisation: string;
  country: string;
  stateOrRegion: string;
  roleTitle: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'SUSPENDED';
  createdAt: string;
  createdByUid: string;
  isSynthetic: boolean;
}

export interface AccessRequest {
  requestId: string;
  researcherId: string;
  organisation: string;
  country: string;
  stateOrRegion: string;
  dataCategory: DataCategory;
  purpose: ResearchPurpose;
  requestedDurationDays: number;
  consentReferenceId: string;
  submittedAt: string;
  evaluatedAt: string;
  decisionStatus: DecisionStatus;
  decisionExplanation: string;
  evaluatedConditions: string[];
  matchedPolicyIds: string[];
  policyCompliant: boolean;
  submittedByUid: string;
  isSynthetic: boolean;
}

export interface GovernancePolicy {
  policyId: string;
  policyName: string;
  description: string;
  permittedOrganisations: string[];
  permittedPurposes: string[];
  permittedDataCategories: string[];
  maxDurationDays: number;
  requiresConsent: boolean;
  communityRestrictionNote: string;
  status: PolicyStatus;
  createdAt: string;
  createdByUid: string;
  isSynthetic: boolean;
}

export interface ConsentReference {
  consentReferenceId: string;
  pseudonymousSubjectId: string;
  organisation: string;
  permittedPurpose: string;
  permittedDataCategories: string[];
  consentStatus: ConsentStatus;
  expiryDate: string;
  externalSourceId: string;
  createdByUid: string;
  isSynthetic: boolean;
}

export interface AuditEvent {
  eventId: string;
  requestId: string;
  eventType: AuditEventType;
  timestamp: string;
  actor: string;
  actorUid: string;
  decision: string;
  explanation: string;
  policyReferences: string[];
  isSynthetic: boolean;
}

export interface SystemMeta {
  seeded: boolean;
  seededAt: string;
  appVersion: string;
  seededByUid: string;
}

export interface DashboardSummary {
  totalRequests: number;
  approved: number;
  denied: number;
  awaitingReview: number;
  reviewCount: number;
  pendingCount: number;
}

export interface StateActivityMetric {
  state: string;
  total: number;
  approved: number;
  denied: number;
  awaitingReview: number;
}

export interface DecisionDistribution {
  approved: number;
  denied: number;
  awaitingReview: number;
  total: number;
  approvedPct: number;
  deniedPct: number;
  awaitingReviewPct: number;
}

export interface ComplianceMetrics {
  compliantCount: number;
  evaluatedTotal: number;
  complianceRate: number | null;
}

export interface ActivityPoint {
  bucketLabel: string;
  isoStart: string;
  submitted: number;
  evaluated: number;
}

export const ID_REGEX = /^[a-zA-Z0-9_-]{2,64}$/;

export function isValidEntityId(id: unknown): id is string {
  return typeof id === 'string' && ID_REGEX.test(id);
}

export function isValidDataCategoryValue(val: unknown): val is DataCategory {
  return typeof val === 'string' && (DATA_CATEGORIES as readonly string[]).includes(val);
}

export function isValidPurposeValue(val: unknown): val is ResearchPurpose {
  return typeof val === 'string' && (RESEARCH_PURPOSES as readonly string[]).includes(val);
}
