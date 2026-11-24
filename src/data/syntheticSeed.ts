import {
  AccessRequest,
  AuditEvent,
  ConsentReference,
  DataCategory,
  GovernancePolicy,
  ResearchPurpose,
  Researcher,
} from '../types/governance.ts';
import { InMemoryConsentVerifier, evaluateAccessRequest } from '../services/policyEngine.ts';

function daysAgoIso(daysAgo: number, hourOffset = 10): string {
  const base = new Date('2026-11-24T09:00:00.000Z').getTime();
  const dt = new Date(base - daysAgo * 86400000 + hourOffset * 3600000);
  return dt.toISOString();
}

function daysFromNowIso(daysAhead: number): string {
  const base = new Date('2026-11-24T09:00:00.000Z').getTime();
  return new Date(base + daysAhead * 86400000).toISOString();
}

export interface SyntheticSeedBundle {
  researchers: Researcher[];
  policies: GovernancePolicy[];
  consentReferences: ConsentReference[];
  accessRequests: AccessRequest[];
  auditEvents: AuditEvent[];
}

export async function buildSyntheticSeedBundle(actorUid: string, actorLabel: string): Promise<SyntheticSeedBundle> {
  const researchers: Researcher[] = [
    {
      researcherId: 'RES-001',
      fullName: 'Dr. Adebayo Ogunleye',
      organisation: 'Ibadan Community Health Institute',
      country: 'Nigeria',
      stateOrRegion: 'Oyo',
      roleTitle: 'Senior Epidemiologist',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(70),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-002',
      fullName: 'Dr. Zainab Danjuma',
      organisation: 'Lagos Civic Medical Consortium',
      country: 'Nigeria',
      stateOrRegion: 'Lagos',
      roleTitle: 'Public Health Informatics Lead',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(68),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-003',
      fullName: 'Prof. Chinedu Okafor',
      organisation: 'Nsukka Population Health Lab',
      country: 'Nigeria',
      stateOrRegion: 'Enugu',
      roleTitle: 'Biostatistics Director',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(65),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-004',
      fullName: 'Dr. Hauwa Abdullahi',
      organisation: 'Kano Maternal Data Cooperative',
      country: 'Nigeria',
      stateOrRegion: 'Kano',
      roleTitle: 'Clinical Research Fellow',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(60),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-005',
      fullName: 'Dr. Tamuno Briggs',
      organisation: 'Delta Environmental Health Trust',
      country: 'Nigeria',
      stateOrRegion: 'Rivers',
      roleTitle: 'Environmental Health Analyst',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(58),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-006',
      fullName: 'Dr. Funmilayo Adeyemi',
      organisation: 'Abuja Mental Wellbeing Observatory',
      country: 'Nigeria',
      stateOrRegion: 'FCT Abuja',
      roleTitle: 'Psychiatric Epidemiology Lead',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(55),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-007',
      fullName: 'Kelechi Nwosu',
      organisation: 'Kaduna Clinical AI Collective',
      country: 'Nigeria',
      stateOrRegion: 'Kaduna',
      roleTitle: 'Applied ML Researcher',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(50),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-008',
      fullName: 'Dr. Osahon Igbinedion',
      organisation: 'Benin Genomic Ethics Centre',
      country: 'Nigeria',
      stateOrRegion: 'Edo',
      roleTitle: 'Genomics Governance Fellow',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(48),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-009',
      fullName: 'Amina Yusuf',
      organisation: 'Jos Community Health Network',
      country: 'Nigeria',
      stateOrRegion: 'Plateau',
      roleTitle: 'Survey Methodologist',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(42),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-010',
      fullName: 'Tunde Balogun',
      organisation: 'Ogun Primary Care Analytics',
      country: 'Nigeria',
      stateOrRegion: 'Ogun',
      roleTitle: 'Data Steward',
      verificationStatus: 'PENDING',
      createdAt: daysAgoIso(35),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-011',
      fullName: 'Marcus Vance',
      organisation: 'Northbridge Commercial BioLabs',
      country: 'United Kingdom',
      stateOrRegion: 'Lagos',
      roleTitle: 'Commercial Analytics Lead',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(30),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-012',
      fullName: 'Ngozi Eze',
      organisation: 'Cross River Tropical Survey Unit',
      country: 'Nigeria',
      stateOrRegion: 'Cross River',
      roleTitle: 'Field Research Coordinator',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(25),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-013',
      fullName: 'Ibrahim Shehu',
      organisation: 'Sahel Health Monitoring Group',
      country: 'Nigeria',
      stateOrRegion: 'Borno',
      roleTitle: 'Public Health Analyst',
      verificationStatus: 'SUSPENDED',
      createdAt: daysAgoIso(22),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      researcherId: 'RES-014',
      fullName: 'Dr. Efe Akpoveta',
      organisation: 'Awka Civic Data Collaborative',
      country: 'Nigeria',
      stateOrRegion: 'Anambra',
      roleTitle: 'Health Systems Researcher',
      verificationStatus: 'VERIFIED',
      createdAt: daysAgoIso(18),
      createdByUid: actorUid,
      isSynthetic: true,
    },
  ];

  const policies: GovernancePolicy[] = [
    {
      policyId: 'POL-001',
      policyName: 'Public Health Records Stewardship',
      description: 'Authorises verified Nigerian civic and academic consortia to inspect pseudonymised health records for public-health surveillance.',
      permittedOrganisations: [
        'Ibadan Community Health Institute',
        'Lagos Civic Medical Consortium',
        'Kano Maternal Data Cooperative',
        'Delta Environmental Health Trust',
        'Nsukka Population Health Lab',
        'Awka Civic Data Collaborative',
      ],
      permittedPurposes: ['Public-health research', 'Academic research'],
      permittedDataCategories: ['Health records', 'Demographic information'],
      maxDurationDays: 180,
      requiresConsent: true,
      communityRestrictionNote: 'Aggregate outputs only; no re-identification attempts permitted.',
      status: 'ACTIVE',
      createdAt: daysAgoIso(75),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-002',
      policyName: 'Community Mental-Health Protection Charter',
      description: 'Restricts access to sensitive mental-health records strictly to dedicated clinical and ethics-cleared institutions.',
      permittedOrganisations: [
        'Abuja Mental Wellbeing Observatory',
        'Lagos Civic Medical Consortium',
        'Ibadan Community Health Institute',
      ],
      permittedPurposes: ['Mental-health research'],
      permittedDataCategories: ['Mental-health information', 'Survey responses'],
      maxDurationDays: 120,
      requiresConsent: true,
      communityRestrictionNote: 'Subject-level consent required; secondary sharing strictly prohibited.',
      status: 'ACTIVE',
      createdAt: daysAgoIso(74),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-003',
      policyName: 'Anonymous Demographic & Survey Open Protocol',
      description: 'Supports statistical analysis of anonymised demographic and survey responses across recognised research organisations.',
      permittedOrganisations: ['*'],
      permittedPurposes: ['Anonymous statistical analysis', 'Academic research', 'Public-health research'],
      permittedDataCategories: ['Demographic information', 'Survey responses'],
      maxDurationDays: 365,
      requiresConsent: false,
      communityRestrictionNote: 'Anonymised tables only; cell counts below 10 must be suppressed.',
      status: 'ACTIVE',
      createdAt: daysAgoIso(73),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-004',
      policyName: 'Responsible Clinical AI Development Standard',
      description: 'Governs training and validation of clinical decision-support models using health and survey datasets.',
      permittedOrganisations: [
        'Kaduna Clinical AI Collective',
        'Lagos Civic Medical Consortium',
        'Ibadan Community Health Institute',
      ],
      permittedPurposes: ['AI model development'],
      permittedDataCategories: ['Health records', 'Survey responses', 'Demographic information'],
      maxDurationDays: 90,
      requiresConsent: true,
      communityRestrictionNote: 'Model weights must remain open-licensed for community health benefit.',
      status: 'ACTIVE',
      createdAt: daysAgoIso(72),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-005',
      policyName: 'Genomic Data Sovereignty & Ethics Mandate',
      description: 'High-protection policy governing genomic data access under community ethics board oversight.',
      permittedOrganisations: [
        'Benin Genomic Ethics Centre',
        'Ibadan Community Health Institute',
      ],
      permittedPurposes: ['Academic research', 'Public-health research'],
      permittedDataCategories: ['Genomic information'],
      maxDurationDays: 90,
      requiresConsent: true,
      communityRestrictionNote: 'Community benefit-sharing agreement verified prior to access.',
      status: 'ACTIVE',
      createdAt: daysAgoIso(70),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-006',
      policyName: 'Genomic AI Governance Gate',
      description: 'Requires mandatory human community panel review whenever genomic datasets are proposed for AI training.',
      permittedOrganisations: ['*'],
      permittedPurposes: ['AI model development'],
      permittedDataCategories: ['Genomic information'],
      maxDurationDays: 60,
      requiresConsent: true,
      communityRestrictionNote: 'Mandatory panel review required before any genomic AI model development.',
      status: 'ACTIVE',
      createdAt: daysAgoIso(68),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-007',
      policyName: 'Geospatial Mobility & Outbreak Surveillance',
      description: 'Authorises state-level and environmental health teams to inspect location datasets for public-health preparedness.',
      permittedOrganisations: [
        'Delta Environmental Health Trust',
        'Cross River Tropical Survey Unit',
        'Lagos Civic Medical Consortium',
        'Kano Maternal Data Cooperative',
      ],
      permittedPurposes: ['Public-health research', 'Academic research'],
      permittedDataCategories: ['Location information'],
      maxDurationDays: 60,
      requiresConsent: true,
      communityRestrictionNote: 'Coordinates must remain coarsened to ward/LGA resolution.',
      status: 'ACTIVE',
      createdAt: daysAgoIso(65),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-008',
      policyName: 'Academic Survey & Field Research Framework',
      description: 'Covers academic and public-health analysis of community health survey responses.',
      permittedOrganisations: ['*'],
      permittedPurposes: ['Academic research', 'Public-health research'],
      permittedDataCategories: ['Survey responses', 'Other research data'],
      maxDurationDays: 240,
      requiresConsent: true,
      communityRestrictionNote: 'Requires valid community cohort consent reference.',
      status: 'ACTIVE',
      createdAt: daysAgoIso(62),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-009',
      policyName: 'Maternal & Neonatal Cohort Access Rule',
      description: 'Focused rules for maternal health records across northern and southern regional cooperatives.',
      permittedOrganisations: [
        'Kano Maternal Data Cooperative',
        'Jos Community Health Network',
        'Nsukka Population Health Lab',
      ],
      permittedPurposes: ['Public-health research', 'Academic research'],
      permittedDataCategories: ['Health records', 'Survey responses'],
      maxDurationDays: 150,
      requiresConsent: true,
      communityRestrictionNote: 'Cohort findings must be shared back with local clinics.',
      status: 'ACTIVE',
      createdAt: daysAgoIso(58),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-010',
      policyName: 'Restricted Commercial Statistical Exemption',
      description: 'Narrow pathway permitting anonymised statistical verification only for pre-vetted public-interest partners.',
      permittedOrganisations: ['Lagos Civic Medical Consortium'],
      permittedPurposes: ['Commercial research'],
      permittedDataCategories: ['Other research data'],
      maxDurationDays: 30,
      requiresConsent: true,
      communityRestrictionNote: 'Zero commercial access to clinical, genomic, or mental-health datasets.',
      status: 'ACTIVE',
      createdAt: daysAgoIso(55),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-011',
      policyName: 'Legacy Pilot Demographic Sharing (Superseded)',
      description: 'Earlier pilot policy superseded by POL-003; retained as inactive historical record.',
      permittedOrganisations: ['*'],
      permittedPurposes: ['Academic research'],
      permittedDataCategories: ['Demographic information'],
      maxDurationDays: 90,
      requiresConsent: false,
      communityRestrictionNote: 'Deactivated following 2026 community charter update.',
      status: 'INACTIVE',
      createdAt: daysAgoIso(120),
      createdByUid: actorUid,
      isSynthetic: true,
    },
    {
      policyId: 'POL-012',
      policyName: 'Deprecated Commercial Survey Trial (Inactive)',
      description: 'Pilot commercial survey access rule deactivated after community governance vote.',
      permittedOrganisations: ['Northbridge Commercial BioLabs'],
      permittedPurposes: ['Commercial research'],
      permittedDataCategories: ['Survey responses'],
      maxDurationDays: 45,
      requiresConsent: true,
      communityRestrictionNote: 'Deactivated by governance committee.',
      status: 'INACTIVE',
      createdAt: daysAgoIso(110),
      createdByUid: actorUid,
      isSynthetic: true,
    },
  ];

  // Build 60 synthetic consent references across organisations, purposes, categories, and statuses
  const orgCycle = [
    'Ibadan Community Health Institute',
    'Lagos Civic Medical Consortium',
    'Nsukka Population Health Lab',
    'Kano Maternal Data Cooperative',
    'Delta Environmental Health Trust',
    'Abuja Mental Wellbeing Observatory',
    'Kaduna Clinical AI Collective',
    'Benin Genomic Ethics Centre',
    'Jos Community Health Network',
    'Ogun Primary Care Analytics',
    'Northbridge Commercial BioLabs',
    'Cross River Tropical Survey Unit',
    'Awka Civic Data Collaborative',
  ];

  const purposeCategoryPairs: Array<{ purpose: ResearchPurpose; cats: DataCategory[] }> = [
    { purpose: 'Public-health research', cats: ['Health records', 'Demographic information'] },
    { purpose: 'Academic research', cats: ['Health records', 'Survey responses', 'Demographic information'] },
    { purpose: 'Mental-health research', cats: ['Mental-health information', 'Survey responses'] },
    { purpose: 'AI model development', cats: ['Health records', 'Survey responses', 'Demographic information'] },
    { purpose: 'Anonymous statistical analysis', cats: ['Demographic information', 'Survey responses'] },
    { purpose: 'Academic research', cats: ['Genomic information'] },
    { purpose: 'Public-health research', cats: ['Location information'] },
    { purpose: 'AI model development', cats: ['Genomic information'] },
    { purpose: 'Public-health research', cats: ['Survey responses', 'Other research data'] },
    { purpose: 'Commercial research', cats: ['Health records', 'Survey responses'] },
  ];

  const consentReferences: ConsentReference[] = [];
  for (let i = 1; i <= 60; i++) {
    const idStr = String(i).padStart(3, '0');
    const org = orgCycle[(i - 1) % orgCycle.length];
    const pair = purposeCategoryPairs[(i - 1) % purposeCategoryPairs.length];

    let consentStatus: ConsentReference['consentStatus'] = 'VALID';
    let expiryDate = daysFromNowIso(180 + (i % 9) * 30);

    if (i >= 43 && i <= 50) {
      consentStatus = 'EXPIRED';
      expiryDate = daysAgoIso(10 + (i - 42) * 7);
    } else if (i >= 51 && i <= 55) {
      consentStatus = 'REVOKED';
      expiryDate = daysFromNowIso(90);
    } else if (i >= 56) {
      consentStatus = 'PENDING';
      expiryDate = daysFromNowIso(240);
    }

    consentReferences.push({
      consentReferenceId: `CREF-${idStr}`,
      pseudonymousSubjectId: `SUBJ-NG-${1000 + i}`,
      organisation: org,
      permittedPurpose: pair.purpose,
      permittedDataCategories: pair.cats,
      consentStatus,
      expiryDate,
      externalSourceId: `SYNTH-HDC-2026-${idStr}`,
      createdByUid: actorUid,
      isSynthetic: true,
    });
  }

  // Ensure exact consent references used by our 40 requests match cleanly
  const overrideConsents: Array<Partial<ConsentReference> & { idx: number }> = [
    { idx: 0, organisation: 'Ibadan Community Health Institute', permittedPurpose: 'Public-health research', permittedDataCategories: ['Health records', 'Demographic information'], consentStatus: 'VALID' },
    { idx: 1, organisation: 'Lagos Civic Medical Consortium', permittedPurpose: 'Public-health research', permittedDataCategories: ['Health records', 'Location information'], consentStatus: 'VALID' },
    { idx: 2, organisation: 'Abuja Mental Wellbeing Observatory', permittedPurpose: 'Mental-health research', permittedDataCategories: ['Mental-health information', 'Survey responses'], consentStatus: 'VALID' },
    { idx: 3, organisation: 'Kano Maternal Data Cooperative', permittedPurpose: 'Public-health research', permittedDataCategories: ['Health records', 'Survey responses'], consentStatus: 'VALID' },
    { idx: 4, organisation: 'Kaduna Clinical AI Collective', permittedPurpose: 'AI model development', permittedDataCategories: ['Health records', 'Survey responses'], consentStatus: 'VALID' },
    { idx: 5, organisation: 'Benin Genomic Ethics Centre', permittedPurpose: 'Academic research', permittedDataCategories: ['Genomic information'], consentStatus: 'VALID' },
    { idx: 6, organisation: 'Delta Environmental Health Trust', permittedPurpose: 'Public-health research', permittedDataCategories: ['Location information', 'Health records'], consentStatus: 'VALID' },
    { idx: 7, organisation: 'Nsukka Population Health Lab', permittedPurpose: 'Academic research', permittedDataCategories: ['Health records', 'Survey responses'], consentStatus: 'VALID' },
    { idx: 8, organisation: 'Jos Community Health Network', permittedPurpose: 'Academic research', permittedDataCategories: ['Survey responses', 'Other research data'], consentStatus: 'VALID' },
    { idx: 9, organisation: 'Cross River Tropical Survey Unit', permittedPurpose: 'Public-health research', permittedDataCategories: ['Location information', 'Survey responses'], consentStatus: 'VALID' },
    { idx: 10, organisation: 'Awka Civic Data Collaborative', permittedPurpose: 'Public-health research', permittedDataCategories: ['Health records', 'Demographic information'], consentStatus: 'VALID' },
    { idx: 11, organisation: 'Ogun Primary Care Analytics', permittedPurpose: 'Public-health research', permittedDataCategories: ['Survey responses', 'Demographic information'], consentStatus: 'VALID' },
    { idx: 12, organisation: 'Lagos Civic Medical Consortium', permittedPurpose: 'AI model development', permittedDataCategories: ['Health records', 'Demographic information'], consentStatus: 'VALID' },
    { idx: 13, organisation: 'Ibadan Community Health Institute', permittedPurpose: 'AI model development', permittedDataCategories: ['Genomic information'], consentStatus: 'VALID' },
    { idx: 14, organisation: 'Northbridge Commercial BioLabs', permittedPurpose: 'Commercial research', permittedDataCategories: ['Health records', 'Survey responses'], consentStatus: 'VALID' },
    { idx: 15, organisation: 'Sahel Health Monitoring Group', permittedPurpose: 'Public-health research', permittedDataCategories: ['Health records'], consentStatus: 'VALID' },
    { idx: 42, organisation: 'Lagos Civic Medical Consortium', permittedPurpose: 'Public-health research', permittedDataCategories: ['Health records'], consentStatus: 'EXPIRED', expiryDate: daysAgoIso(21) },
    { idx: 43, organisation: 'Kano Maternal Data Cooperative', permittedPurpose: 'Academic research', permittedDataCategories: ['Health records'], consentStatus: 'EXPIRED', expiryDate: daysAgoIso(14) },
    { idx: 50, organisation: 'Abuja Mental Wellbeing Observatory', permittedPurpose: 'Mental-health research', permittedDataCategories: ['Mental-health information'], consentStatus: 'REVOKED' },
    { idx: 55, organisation: 'Ibadan Community Health Institute', permittedPurpose: 'Public-health research', permittedDataCategories: ['Health records'], consentStatus: 'PENDING' },
    { idx: 56, organisation: 'Lagos Civic Medical Consortium', permittedPurpose: 'Mental-health research', permittedDataCategories: ['Mental-health information'], consentStatus: 'PENDING' },
  ];

  for (const ov of overrideConsents) {
    Object.assign(consentReferences[ov.idx], {
      organisation: ov.organisation ?? consentReferences[ov.idx].organisation,
      permittedPurpose: ov.permittedPurpose ?? consentReferences[ov.idx].permittedPurpose,
      permittedDataCategories: ov.permittedDataCategories ?? consentReferences[ov.idx].permittedDataCategories,
      consentStatus: ov.consentStatus ?? consentReferences[ov.idx].consentStatus,
      expiryDate: ov.expiryDate ?? consentReferences[ov.idx].expiryDate,
    });
  }

  // 40 synthetic access requests spanning Nigerian states and realistic scenarios
  const requestSpecs: Array<{
    id: string;
    researcherId: string;
    state: string;
    cat: DataCategory;
    purpose: ResearchPurpose;
    days: number;
    consentRef: string;
    submittedDaysAgo: number;
    preEvaluated: boolean;
  }> = [
    // Approved scenarios
    { id: 'REQ-2026-001', researcherId: 'RES-001', state: 'Oyo', cat: 'Health records', purpose: 'Public-health research', days: 90, consentRef: 'CREF-001', submittedDaysAgo: 48, preEvaluated: true },
    { id: 'REQ-2026-002', researcherId: 'RES-002', state: 'Lagos', cat: 'Health records', purpose: 'Public-health research', days: 120, consentRef: 'CREF-002', submittedDaysAgo: 46, preEvaluated: true },
    { id: 'REQ-2026-003', researcherId: 'RES-006', state: 'FCT Abuja', cat: 'Mental-health information', purpose: 'Mental-health research', days: 90, consentRef: 'CREF-003', submittedDaysAgo: 44, preEvaluated: true },
    { id: 'REQ-2026-004', researcherId: 'RES-004', state: 'Kano', cat: 'Health records', purpose: 'Public-health research', days: 120, consentRef: 'CREF-004', submittedDaysAgo: 42, preEvaluated: true },
    { id: 'REQ-2026-005', researcherId: 'RES-007', state: 'Kaduna', cat: 'Health records', purpose: 'AI model development', days: 60, consentRef: 'CREF-005', submittedDaysAgo: 40, preEvaluated: true },
    { id: 'REQ-2026-006', researcherId: 'RES-008', state: 'Edo', cat: 'Genomic information', purpose: 'Academic research', days: 90, consentRef: 'CREF-006', submittedDaysAgo: 38, preEvaluated: true },
    { id: 'REQ-2026-007', researcherId: 'RES-005', state: 'Rivers', cat: 'Location information', purpose: 'Public-health research', days: 45, consentRef: 'CREF-007', submittedDaysAgo: 37, preEvaluated: true },
    { id: 'REQ-2026-008', researcherId: 'RES-003', state: 'Enugu', cat: 'Health records', purpose: 'Academic research', days: 150, consentRef: 'CREF-008', submittedDaysAgo: 35, preEvaluated: true },
    { id: 'REQ-2026-009', researcherId: 'RES-009', state: 'Plateau', cat: 'Survey responses', purpose: 'Academic research', days: 180, consentRef: 'CREF-009', submittedDaysAgo: 33, preEvaluated: true },
    { id: 'REQ-2026-010', researcherId: 'RES-012', state: 'Cross River', cat: 'Location information', purpose: 'Public-health research', days: 60, consentRef: 'CREF-010', submittedDaysAgo: 31, preEvaluated: true },
    { id: 'REQ-2026-011', researcherId: 'RES-014', state: 'Anambra', cat: 'Health records', purpose: 'Public-health research', days: 90, consentRef: 'CREF-011', submittedDaysAgo: 29, preEvaluated: true },
    { id: 'REQ-2026-012', researcherId: 'RES-002', state: 'Lagos', cat: 'AI model development' === 'AI model development' ? 'Health records' : 'Health records', purpose: 'AI model development', days: 75, consentRef: 'CREF-013', submittedDaysAgo: 28, preEvaluated: true },
    { id: 'REQ-2026-013', researcherId: 'RES-001', state: 'Oyo', cat: 'Demographic information', purpose: 'Anonymous statistical analysis', days: 300, consentRef: '', submittedDaysAgo: 26, preEvaluated: true },
    { id: 'REQ-2026-014', researcherId: 'RES-003', state: 'Enugu', cat: 'Survey responses', purpose: 'Anonymous statistical analysis', days: 240, consentRef: '', submittedDaysAgo: 25, preEvaluated: true },
    { id: 'REQ-2026-015', researcherId: 'RES-004', state: 'Kano', cat: 'Demographic information', purpose: 'Anonymous statistical analysis', days: 180, consentRef: '', submittedDaysAgo: 23, preEvaluated: true },
    { id: 'REQ-2026-016', researcherId: 'RES-005', state: 'Delta', cat: 'Health records', purpose: 'Public-health research', days: 120, consentRef: 'CREF-007', submittedDaysAgo: 21, preEvaluated: true },
    { id: 'REQ-2026-017', researcherId: 'RES-006', state: 'FCT Abuja', cat: 'Survey responses', purpose: 'Mental-health research', days: 90, consentRef: 'CREF-003', submittedDaysAgo: 19, preEvaluated: true },
    { id: 'REQ-2026-018', researcherId: 'RES-002', state: 'Lagos', cat: 'Location information', purpose: 'Public-health research', days: 30, consentRef: 'CREF-002', submittedDaysAgo: 17, preEvaluated: true },
    { id: 'REQ-2026-019', researcherId: 'RES-009', state: 'Sokoto', cat: 'Demographic information', purpose: 'Anonymous statistical analysis', days: 200, consentRef: '', submittedDaysAgo: 15, preEvaluated: true },

    // Denied scenarios (expired consent, revoked consent, commercial prohibition, duration exceeded, suspended researcher, missing policy)
    { id: 'REQ-2026-020', researcherId: 'RES-002', state: 'Lagos', cat: 'Health records', purpose: 'Public-health research', days: 90, consentRef: 'CREF-043', submittedDaysAgo: 41, preEvaluated: true }, // EXPIRED consent
    { id: 'REQ-2026-021', researcherId: 'RES-004', state: 'Kano', cat: 'Health records', purpose: 'Academic research', days: 90, consentRef: 'CREF-044', submittedDaysAgo: 39, preEvaluated: true }, // EXPIRED consent
    { id: 'REQ-2026-022', researcherId: 'RES-006', state: 'FCT Abuja', cat: 'Mental-health information', purpose: 'Mental-health research', days: 60, consentRef: 'CREF-051', submittedDaysAgo: 34, preEvaluated: true }, // REVOKED consent
    { id: 'REQ-2026-023', researcherId: 'RES-011', state: 'Lagos', cat: 'Health records', purpose: 'Commercial research', days: 60, consentRef: 'CREF-015', submittedDaysAgo: 32, preEvaluated: true }, // No active commercial policy for Health records
    { id: 'REQ-2026-024', researcherId: 'RES-011', state: 'Rivers', cat: 'Survey responses', purpose: 'Commercial research', days: 45, consentRef: 'CREF-015', submittedDaysAgo: 30, preEvaluated: true }, // POL-012 is INACTIVE
    { id: 'REQ-2026-025', researcherId: 'RES-007', state: 'Kaduna', cat: 'Health records', purpose: 'AI model development', days: 240, consentRef: 'CREF-005', submittedDaysAgo: 27, preEvaluated: true }, // Exceeds 90-day duration cap
    { id: 'REQ-2026-026', researcherId: 'RES-005', state: 'Rivers', cat: 'Location information', purpose: 'Public-health research', days: 180, consentRef: 'CREF-007', submittedDaysAgo: 24, preEvaluated: true }, // Exceeds 60-day location cap
    { id: 'REQ-2026-027', researcherId: 'RES-013', state: 'Borno', cat: 'Health records', purpose: 'Public-health research', days: 60, consentRef: 'CREF-016', submittedDaysAgo: 22, preEvaluated: true }, // SUSPENDED researcher
    { id: 'REQ-2026-028', researcherId: 'RES-001', state: 'Oyo', cat: 'Health records', purpose: 'Public-health research', days: 60, consentRef: 'CREF-999', submittedDaysAgo: 20, preEvaluated: true }, // Invalid/missing consent reference
    { id: 'REQ-2026-029', researcherId: 'RES-008', state: 'Edo', cat: 'Genomic information', purpose: 'Commercial research', days: 30, consentRef: 'CREF-006', submittedDaysAgo: 18, preEvaluated: true }, // Prohibited commercial genomic
    { id: 'REQ-2026-030', researcherId: 'RES-003', state: 'Enugu', cat: 'Mental-health information', purpose: 'AI model development', days: 45, consentRef: 'CREF-008', submittedDaysAgo: 14, preEvaluated: true }, // No active policy for Mental-health AI
    { id: 'REQ-2026-031', researcherId: 'RES-014', state: 'Anambra', cat: 'Health records', purpose: 'Public-health research', days: 365, consentRef: 'CREF-011', submittedDaysAgo: 12, preEvaluated: true }, // Exceeds 180-day cap

    // REVIEW scenarios (genomic AI mandatory panel review, pending researcher verification, pending consent, org outside allowlist)
    { id: 'REQ-2026-032', researcherId: 'RES-001', state: 'Oyo', cat: 'Genomic information', purpose: 'AI model development', days: 45, consentRef: 'CREF-014', submittedDaysAgo: 16, preEvaluated: true },
    { id: 'REQ-2026-033', researcherId: 'RES-010', state: 'Ogun', cat: 'Survey responses', purpose: 'Public-health research', days: 90, consentRef: 'CREF-012', submittedDaysAgo: 13, preEvaluated: true }, // PENDING researcher
    { id: 'REQ-2026-034', researcherId: 'RES-001', state: 'Lagos', cat: 'Health records', purpose: 'Public-health research', days: 60, consentRef: 'CREF-056', submittedDaysAgo: 10, preEvaluated: true }, // PENDING consent
    { id: 'REQ-2026-035', researcherId: 'RES-002', state: 'FCT Abuja', cat: 'Mental-health information', purpose: 'Mental-health research', days: 60, consentRef: 'CREF-057', submittedDaysAgo: 8, preEvaluated: true }, // PENDING consent
    { id: 'REQ-2026-036', researcherId: 'RES-009', state: 'Plateau', cat: 'Location information', purpose: 'Public-health research', days: 45, consentRef: 'CREF-009', submittedDaysAgo: 6, preEvaluated: true }, // Org outside pre-approved list -> REVIEW
    { id: 'REQ-2026-037', researcherId: 'RES-012', state: 'Cross River', cat: 'Health records', purpose: 'Academic research', days: 90, consentRef: 'CREF-010', submittedDaysAgo: 5, preEvaluated: true }, // Org outside POL-001 allowlist -> REVIEW

    // PENDING (awaiting initial evaluation) scenarios
    { id: 'REQ-2026-038', researcherId: 'RES-002', state: 'Lagos', cat: 'Survey responses', purpose: 'Public-health research', days: 60, consentRef: 'CREF-002', submittedDaysAgo: 3, preEvaluated: false },
    { id: 'REQ-2026-039', researcherId: 'RES-004', state: 'Kano', cat: 'Health records', purpose: 'Public-health research', days: 90, consentRef: 'CREF-004', submittedDaysAgo: 2, preEvaluated: false },
    { id: 'REQ-2026-040', researcherId: 'RES-006', state: 'FCT Abuja', cat: 'Mental-health information', purpose: 'Mental-health research', days: 60, consentRef: 'CREF-003', submittedDaysAgo: 1, preEvaluated: false },
  ];

  const researcherMap = new Map(researchers.map((r) => [r.researcherId, r]));
  const consentVerifier = new InMemoryConsentVerifier(consentReferences);

  const accessRequests: AccessRequest[] = [];
  const auditEvents: AuditEvent[] = [];
  let evtCounter = 1;
  const nextEventId = () => `EVT-${String(evtCounter++).padStart(4, '0')}`;

  // Seed initial policy audit events
  for (const pol of policies) {
    auditEvents.push({
      eventId: nextEventId(),
      requestId: '',
      eventType: 'POLICY_CREATED',
      timestamp: pol.createdAt,
      actor: actorLabel,
      actorUid,
      decision: pol.status,
      explanation: `Created synthetic governance policy ${pol.policyId}: ${pol.policyName}.`,
      policyReferences: [pol.policyId],
      isSynthetic: true,
    });
    if (pol.status === 'INACTIVE') {
      auditEvents.push({
        eventId: nextEventId(),
        requestId: '',
        eventType: 'POLICY_DEACTIVATED',
        timestamp: daysAgoIso(60),
        actor: actorLabel,
        actorUid,
        decision: 'INACTIVE',
        explanation: `Deactivated legacy synthetic policy ${pol.policyId}: ${pol.policyName}.`,
        policyReferences: [pol.policyId],
        isSynthetic: true,
      });
    }
  }

  for (const spec of requestSpecs) {
    const researcher = researcherMap.get(spec.researcherId)!;
    const submittedAt = daysAgoIso(spec.submittedDaysAgo, 8);
    const evalTime = daysAgoIso(spec.submittedDaysAgo, 14);

    const draftReq: AccessRequest = {
      requestId: spec.id,
      researcherId: spec.researcherId,
      organisation: researcher.organisation,
      country: researcher.country,
      stateOrRegion: spec.state,
      dataCategory: spec.cat,
      purpose: spec.purpose,
      requestedDurationDays: spec.days,
      consentReferenceId: spec.consentRef,
      submittedAt,
      evaluatedAt: '',
      decisionStatus: 'PENDING',
      decisionExplanation: 'Awaiting deterministic policy evaluation.',
      evaluatedConditions: [],
      matchedPolicyIds: [],
      policyCompliant: false,
      submittedByUid: actorUid,
      isSynthetic: true,
    };

    auditEvents.push({
      eventId: nextEventId(),
      requestId: draftReq.requestId,
      eventType: 'ACCESS_REQUEST_SUBMITTED',
      timestamp: submittedAt,
      actor: `${researcher.fullName} (${researcher.organisation})`,
      actorUid,
      decision: 'PENDING',
      explanation: `Submitted synthetic access request ${draftReq.requestId} for ${draftReq.dataCategory} (${draftReq.purpose}).`,
      policyReferences: [],
      isSynthetic: true,
    });

    if (spec.preEvaluated) {
      const outcome = await evaluateAccessRequest({
        request: draftReq,
        researcher,
        policies,
        consentVerifier,
        evaluationTimeIso: evalTime,
      });

      draftReq.evaluatedAt = outcome.evaluatedAt;
      draftReq.decisionStatus = outcome.decisionStatus;
      draftReq.decisionExplanation = outcome.decisionExplanation;
      draftReq.evaluatedConditions = outcome.evaluatedConditions;
      draftReq.matchedPolicyIds = outcome.matchedPolicyIds;
      draftReq.policyCompliant = outcome.policyCompliant;

      if (outcome.consentCheck.checked) {
        auditEvents.push({
          eventId: nextEventId(),
          requestId: draftReq.requestId,
          eventType: 'CONSENT_REFERENCE_CHECKED',
          timestamp: evalTime,
          actor: 'DataTrust Policy Engine (Synthetic)',
          actorUid,
          decision: outcome.consentCheck.status,
          explanation: outcome.consentCheck.reason,
          policyReferences: outcome.matchedPolicyIds,
          isSynthetic: true,
        });
      }

      auditEvents.push({
        eventId: nextEventId(),
        requestId: draftReq.requestId,
        eventType: 'ACCESS_REQUEST_EVALUATED',
        timestamp: evalTime,
        actor: 'DataTrust Policy Engine (Synthetic)',
        actorUid,
        decision: outcome.decisionStatus,
        explanation: outcome.decisionExplanation,
        policyReferences: outcome.matchedPolicyIds,
        isSynthetic: true,
      });

      auditEvents.push({
        eventId: nextEventId(),
        requestId: draftReq.requestId,
        eventType: 'ACCESS_DECISION_RECORDED',
        timestamp: evalTime,
        actor: actorLabel,
        actorUid,
        decision: outcome.decisionStatus,
        explanation: `Recorded governance decision ${outcome.decisionStatus} for ${draftReq.requestId}.`,
        policyReferences: outcome.matchedPolicyIds,
        isSynthetic: true,
      });
    }

    accessRequests.push(draftReq);
  }

  return {
    researchers,
    policies,
    consentReferences,
    accessRequests,
    auditEvents,
  };
}
