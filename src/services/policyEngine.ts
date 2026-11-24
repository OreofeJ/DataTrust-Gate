import {
  type AccessRequest,
  type ConsentReference,
  type DecisionStatus,
  type GovernancePolicy,
  type Researcher,
  isValidDataCategoryValue,
  isValidEntityId,
  isValidPurposeValue,
} from '../types/governance.ts';

export interface ConsentCheckResult {
  checked: boolean;
  valid: boolean;
  status: 'VALID' | 'EXPIRED' | 'REVOKED' | 'PENDING' | 'MISSING' | 'MISMATCH';
  consentReferenceId: string;
  externalSourceId: string;
  reason: string;
}

/**
 * Decoupled Consent Verification Interface.
 * For MVP v0.1.0, SyntheticConsentVerifier resolves references from Firestore.
 * In future versions, an HdcRestConsentVerifier implementing this interface
 * can query an external Health Data Cooperative (HDC) REST endpoint.
 */
export interface ConsentVerificationProvider {
  readonly providerName: string;
  verify(
    consentReferenceId: string,
    request: Pick<AccessRequest, 'organisation' | 'purpose' | 'dataCategory'>,
    evaluationIsoTime: string,
  ): Promise<ConsentCheckResult>;
}

export class InMemoryConsentVerifier implements ConsentVerificationProvider {
  readonly providerName = 'SyntheticFirestoreConsentReferenceProvider (Pre-HDC)';
  private readonly store: Map<string, ConsentReference>;

  constructor(references: ConsentReference[]) {
    this.store = new Map(references.map((r) => [r.consentReferenceId, r]));
  }

  async verify(
    consentReferenceId: string,
    request: Pick<AccessRequest, 'organisation' | 'purpose' | 'dataCategory'>,
    evaluationIsoTime: string,
  ): Promise<ConsentCheckResult> {
    const trimmed = (consentReferenceId || '').trim();
    if (!trimmed) {
      return {
        checked: true,
        valid: false,
        status: 'MISSING',
        consentReferenceId: '',
        externalSourceId: 'NONE',
        reason: 'No consent reference ID was provided on the access request.',
      };
    }

    const ref = this.store.get(trimmed);
    if (!ref) {
      return {
        checked: true,
        valid: false,
        status: 'MISSING',
        consentReferenceId: trimmed,
        externalSourceId: 'UNRESOLVED',
        reason: `Consent reference "${trimmed}" was not found in the synthetic consent registry.`,
      };
    }

    if (ref.consentStatus === 'REVOKED') {
      return {
        checked: true,
        valid: false,
        status: 'REVOKED',
        consentReferenceId: ref.consentReferenceId,
        externalSourceId: ref.externalSourceId,
        reason: `Consent reference ${ref.consentReferenceId} has been REVOKED by the data subject.`,
      };
    }

    const nowMs = Date.parse(evaluationIsoTime);
    const expMs = Date.parse(ref.expiryDate);
    if (ref.consentStatus === 'EXPIRED' || (!Number.isNaN(expMs) && !Number.isNaN(nowMs) && expMs < nowMs)) {
      return {
        checked: true,
        valid: false,
        status: 'EXPIRED',
        consentReferenceId: ref.consentReferenceId,
        externalSourceId: ref.externalSourceId,
        reason: `Consent reference ${ref.consentReferenceId} expired on ${ref.expiryDate.slice(0, 10)}.`,
      };
    }

    if (ref.consentStatus === 'PENDING') {
      return {
        checked: true,
        valid: false,
        status: 'PENDING',
        consentReferenceId: ref.consentReferenceId,
        externalSourceId: ref.externalSourceId,
        reason: `Consent reference ${ref.consentReferenceId} is still PENDING subject confirmation.`,
      };
    }

    const orgMatch =
      ref.organisation.toLowerCase() === request.organisation.toLowerCase() ||
      ref.organisation === '*';
    if (!orgMatch) {
      return {
        checked: true,
        valid: false,
        status: 'MISMATCH',
        consentReferenceId: ref.consentReferenceId,
        externalSourceId: ref.externalSourceId,
        reason: `Consent ${ref.consentReferenceId} is scoped to "${ref.organisation}", not "${request.organisation}".`,
      };
    }

    const purposeMatch =
      ref.permittedPurpose.toLowerCase() === request.purpose.toLowerCase() ||
      ref.permittedPurpose === '*';
    if (!purposeMatch) {
      return {
        checked: true,
        valid: false,
        status: 'MISMATCH',
        consentReferenceId: ref.consentReferenceId,
        externalSourceId: ref.externalSourceId,
        reason: `Consent ${ref.consentReferenceId} covers "${ref.permittedPurpose}", not "${request.purpose}".`,
      };
    }

    const categoryMatch =
      ref.permittedDataCategories.includes(request.dataCategory) ||
      ref.permittedDataCategories.includes('*');
    if (!categoryMatch) {
      return {
        checked: true,
        valid: false,
        status: 'MISMATCH',
        consentReferenceId: ref.consentReferenceId,
        externalSourceId: ref.externalSourceId,
        reason: `Consent ${ref.consentReferenceId} does not authorise category "${request.dataCategory}".`,
      };
    }

    return {
      checked: true,
      valid: true,
      status: 'VALID',
      consentReferenceId: ref.consentReferenceId,
      externalSourceId: ref.externalSourceId,
      reason: `Consent ${ref.consentReferenceId} (${ref.externalSourceId}) is VALID through ${ref.expiryDate.slice(0, 10)}.`,
    };
  }
}

export interface EvaluationInput {
  request: AccessRequest;
  researcher?: Researcher;
  policies: GovernancePolicy[];
  consentVerifier: ConsentVerificationProvider;
  evaluationTimeIso?: string;
}

export interface EvaluationOutput {
  decisionStatus: Exclude<DecisionStatus, 'PENDING'>;
  decisionExplanation: string;
  evaluatedConditions: string[];
  matchedPolicyIds: string[];
  policyCompliant: boolean;
  evaluatedAt: string;
  consentCheck: ConsentCheckResult;
}

/**
 * Deterministic Server-Side / Trusted Governance Policy Evaluation Engine.
 * Fails closed: missing or invalid permissions never result in APPROVED.
 * REVIEW is never treated as approval.
 */
export async function evaluateAccessRequest(input: EvaluationInput): Promise<EvaluationOutput> {
  const { request, researcher, policies, consentVerifier } = input;
  const evaluatedAt = input.evaluationTimeIso || new Date().toISOString();
  const conditions: string[] = [];

  // 1. Validate request structural identifiers & enums (fail closed)
  if (!isValidEntityId(request.requestId) || !isValidEntityId(request.researcherId)) {
    const emptyConsent: ConsentCheckResult = {
      checked: false,
      valid: false,
      status: 'MISSING',
      consentReferenceId: request.consentReferenceId || '',
      externalSourceId: 'NONE',
      reason: 'Evaluation halted prior to consent check due to malformed identifier.',
    };
    return {
      decisionStatus: 'DENIED',
      decisionExplanation: 'Denied: Request ID or Researcher ID failed deterministic identifier validation.',
      evaluatedConditions: ['[FAIL] Identifier validation failed (expected alphanumeric/hyphen/underscore 2-64 chars).'],
      matchedPolicyIds: [],
      policyCompliant: false,
      evaluatedAt,
      consentCheck: emptyConsent,
    };
  }

  // 2. Check researcher & organisation information
  if (!request.organisation || request.organisation.trim().length < 2) {
    conditions.push('[FAIL] Organisation name is missing or incomplete.');
    const consentCheck = await consentVerifier.verify(request.consentReferenceId, request, evaluatedAt);
    return {
      decisionStatus: 'REVIEW',
      decisionExplanation: 'Requires review: Organisation metadata is incomplete and requires manual verification.',
      evaluatedConditions: conditions,
      matchedPolicyIds: [],
      policyCompliant: false,
      evaluatedAt,
      consentCheck,
    };
  }

  if (researcher) {
    if (researcher.verificationStatus === 'SUSPENDED') {
      conditions.push(`[FAIL] Researcher ${researcher.researcherId} (${researcher.fullName}) is SUSPENDED.`);
      const consentCheck = await consentVerifier.verify(request.consentReferenceId, request, evaluatedAt);
      return {
        decisionStatus: 'DENIED',
        decisionExplanation: `Denied: Researcher ${researcher.researcherId} holds SUSPENDED status under community governance controls.`,
        evaluatedConditions: conditions,
        matchedPolicyIds: [],
        policyCompliant: false,
        evaluatedAt,
        consentCheck,
      };
    }
    if (researcher.verificationStatus === 'PENDING') {
      conditions.push(`[REVIEW] Researcher ${researcher.researcherId} (${researcher.fullName}) credential verification is PENDING.`);
    } else {
      conditions.push(`[PASS] Researcher ${researcher.researcherId} verified at ${researcher.organisation}.`);
    }
  } else {
    conditions.push(`[REVIEW] Researcher ${request.researcherId} is not yet in verified directory; requires community review.`);
  }

  // 3. Validate data category and intended research purpose
  if (!isValidDataCategoryValue(request.dataCategory)) {
    conditions.push(`[FAIL] Unsupported data category "${String(request.dataCategory)}".`);
    const consentCheck = await consentVerifier.verify(request.consentReferenceId, request, evaluatedAt);
    return {
      decisionStatus: 'DENIED',
      decisionExplanation: `Denied: Data category "${String(request.dataCategory)}" is not a recognised governance category.`,
      evaluatedConditions: conditions,
      matchedPolicyIds: [],
      policyCompliant: false,
      evaluatedAt,
      consentCheck,
    };
  }
  conditions.push(`[PASS] Data category "${request.dataCategory}" validated.`);

  if (!isValidPurposeValue(request.purpose)) {
    conditions.push(`[FAIL] Unsupported research purpose "${String(request.purpose)}".`);
    const consentCheck = await consentVerifier.verify(request.consentReferenceId, request, evaluatedAt);
    return {
      decisionStatus: 'DENIED',
      decisionExplanation: `Denied: Purpose "${String(request.purpose)}" is not permitted under governance enumeration.`,
      evaluatedConditions: conditions,
      matchedPolicyIds: [],
      policyCompliant: false,
      evaluatedAt,
      consentCheck,
    };
  }
  conditions.push(`[PASS] Intended purpose "${request.purpose}" validated.`);

  // 4. Filter ACTIVE policies (inactive policies never authorise access)
  const activePolicies = policies.filter((p) => p.status === 'ACTIVE');
  const inactiveMatches = policies.filter(
    (p) =>
      p.status === 'INACTIVE' &&
      p.permittedPurposes.includes(request.purpose) &&
      p.permittedDataCategories.includes(request.dataCategory),
  );

  if (inactiveMatches.length > 0) {
    conditions.push(
      `[INFO] Ignored ${inactiveMatches.length} INACTIVE policy record(s): ${inactiveMatches.map((p) => p.policyId).join(', ')}.`,
    );
  }

  // Find active policies covering BOTH purpose and dataCategory
  const scopeMatches = activePolicies.filter(
    (p) =>
      (p.permittedPurposes.includes(request.purpose) || p.permittedPurposes.includes('*')) &&
      (p.permittedDataCategories.includes(request.dataCategory) || p.permittedDataCategories.includes('*')),
  );

  const consentCheck = await consentVerifier.verify(request.consentReferenceId, request, evaluatedAt);

  if (scopeMatches.length === 0) {
    conditions.push(
      `[FAIL] No ACTIVE governance policy authorises "${request.purpose}" on "${request.dataCategory}".`,
    );
    conditions.push(`[${consentCheck.valid ? 'PASS' : 'FAIL'}] ${consentCheck.reason}`);
    return {
      decisionStatus: 'DENIED',
      decisionExplanation: `Denied: No active governance policy authorises "${request.purpose}" for "${request.dataCategory}". Requests fail closed when explicit policy authorisation is absent.`,
      evaluatedConditions: conditions,
      matchedPolicyIds: [],
      policyCompliant: false,
      evaluatedAt,
      consentCheck,
    };
  }

  // Prefer policies that explicitly match the requesting organisation, then wildcard policies
  const orgMatchedPolicies = scopeMatches.filter(
    (p) =>
      p.permittedOrganisations.some((o) => o.toLowerCase() === request.organisation.toLowerCase()) ||
      p.permittedOrganisations.includes('*'),
  );

  if (orgMatchedPolicies.length === 0) {
    const candidateIds = scopeMatches.map((p) => p.policyId);
    conditions.push(
      `[REVIEW] Active policy (${candidateIds.join(', ')}) covers purpose/category, but "${request.organisation}" is not on the pre-approved organisation list.`,
    );
    conditions.push(`[${consentCheck.valid ? 'PASS' : 'INFO'}] ${consentCheck.reason}`);

    if (request.purpose === 'Commercial research') {
      return {
        decisionStatus: 'DENIED',
        decisionExplanation: `Denied: Commercial research by unapproved organisation "${request.organisation}" is prohibited under community governance rules (${candidateIds.join(', ')}).`,
        evaluatedConditions: conditions,
        matchedPolicyIds: candidateIds,
        policyCompliant: false,
        evaluatedAt,
        consentCheck,
      };
    }

    return {
      decisionStatus: 'REVIEW',
      decisionExplanation: `Requires community review: "${request.organisation}" is outside pre-approved organisations for policy ${candidateIds.join(', ')}.`,
      evaluatedConditions: conditions,
      matchedPolicyIds: candidateIds,
      policyCompliant: false,
      evaluatedAt,
      consentCheck,
    };
  }

  // Deterministic selection: sort matched policies by policyId so evaluation is 100% reproducible
  const sortedMatched = [...orgMatchedPolicies].sort((a, b) => a.policyId.localeCompare(b.policyId));
  const primaryPolicy = sortedMatched[0];
  const matchedPolicyIds = sortedMatched.map((p) => p.policyId);
  conditions.push(
    `[PASS] Active policy ${primaryPolicy.policyId} ("${primaryPolicy.policyName}") matches organisation, purpose, and category.`,
  );

  // 5. Access duration restrictions
  if (!Number.isInteger(request.requestedDurationDays) || request.requestedDurationDays < 1) {
    conditions.push(`[FAIL] Requested duration (${request.requestedDurationDays} days) is invalid.`);
    return {
      decisionStatus: 'DENIED',
      decisionExplanation: 'Denied: Requested access duration must be a positive integer number of days.',
      evaluatedConditions: conditions,
      matchedPolicyIds,
      policyCompliant: false,
      evaluatedAt,
      consentCheck,
    };
  }

  const maxAllowedDays = Math.max(...sortedMatched.map((p) => p.maxDurationDays));
  if (request.requestedDurationDays > maxAllowedDays) {
    conditions.push(
      `[FAIL] Requested duration of ${request.requestedDurationDays} days exceeds policy cap of ${maxAllowedDays} days (${primaryPolicy.policyId}).`,
    );
    return {
      decisionStatus: 'DENIED',
      decisionExplanation: `Denied: Requested access duration (${request.requestedDurationDays} days) exceeds the maximum ${maxAllowedDays}-day limit permitted by ${primaryPolicy.policyId}.`,
      evaluatedConditions: conditions,
      matchedPolicyIds,
      policyCompliant: false,
      evaluatedAt,
      consentCheck,
    };
  }
  conditions.push(
    `[PASS] Requested duration (${request.requestedDurationDays} days) is within ${maxAllowedDays}-day policy limit.`,
  );

  // 6. Consent reference requirement
  if (primaryPolicy.requiresConsent) {
    if (consentCheck.status === 'PENDING') {
      conditions.push(`[REVIEW] ${consentCheck.reason}`);
      return {
        decisionStatus: 'REVIEW',
        decisionExplanation: `Requires review: ${consentCheck.reason} Access cannot be granted until consent is finalised.`,
        evaluatedConditions: conditions,
        matchedPolicyIds,
        policyCompliant: false,
        evaluatedAt,
        consentCheck,
      };
    }

    if (!consentCheck.valid) {
      conditions.push(`[FAIL] ${consentCheck.reason}`);
      return {
        decisionStatus: 'DENIED',
        decisionExplanation: `Denied: ${consentCheck.reason} Policy ${primaryPolicy.policyId} mandates a valid, unexpired consent reference.`,
        evaluatedConditions: conditions,
        matchedPolicyIds,
        policyCompliant: false,
        evaluatedAt,
        consentCheck,
      };
    }

    conditions.push(`[PASS] ${consentCheck.reason}`);
  } else {
    conditions.push(`[PASS] Policy ${primaryPolicy.policyId} permits anonymous/aggregated access without individual consent reference.`);
  }

  // 7. Community restrictions & researcher verification review gates
  if (!researcher || researcher.verificationStatus === 'PENDING') {
    return {
      decisionStatus: 'REVIEW',
      decisionExplanation: `Requires review: Policy and consent checks passed, but researcher "${request.researcherId}" awaits credential verification before approval.`,
      evaluatedConditions: conditions,
      matchedPolicyIds,
      policyCompliant: false,
      evaluatedAt,
      consentCheck,
    };
  }

  const noteLower = primaryPolicy.communityRestrictionNote.toLowerCase();
  if (
    noteLower.includes('mandatory panel review') ||
    (request.purpose === 'AI model development' &&
      (request.dataCategory === 'Genomic information' || request.dataCategory === 'Mental-health information'))
  ) {
    conditions.push(
      `[REVIEW] Community restriction (${primaryPolicy.policyId}): ${primaryPolicy.communityRestrictionNote}`,
    );
    return {
      decisionStatus: 'REVIEW',
      decisionExplanation: `Requires community governance review: ${primaryPolicy.communityRestrictionNote}`,
      evaluatedConditions: conditions,
      matchedPolicyIds,
      policyCompliant: false,
      evaluatedAt,
      consentCheck,
    };
  }

  conditions.push(`[PASS] Community restriction satisfied: ${primaryPolicy.communityRestrictionNote}`);

  return {
    decisionStatus: 'APPROVED',
    decisionExplanation: `Approved under ${primaryPolicy.policyId} ("${primaryPolicy.policyName}"). All organisation, purpose, category, duration (${request.requestedDurationDays}d <= ${maxAllowedDays}d), and consent requirements passed. Note: This authorisation record does not transfer or expose health data.`,
    evaluatedConditions: conditions,
    matchedPolicyIds,
    policyCompliant: true,
    evaluatedAt,
    consentCheck,
  };
}
