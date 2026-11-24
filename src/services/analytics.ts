import {
  type AccessRequest,
  type ActivityPoint,
  type ComplianceMetrics,
  type DashboardSummary,
  type DecisionDistribution,
  NIGERIA_STATES,
  type StateActivityMetric,
} from '../types/governance.ts';

export function computeDashboardSummary(requests: AccessRequest[]): DashboardSummary {
  let approved = 0;
  let denied = 0;
  let reviewCount = 0;
  let pendingCount = 0;

  for (const r of requests) {
    if (r.decisionStatus === 'APPROVED') approved++;
    else if (r.decisionStatus === 'DENIED') denied++;
    else if (r.decisionStatus === 'REVIEW') reviewCount++;
    else if (r.decisionStatus === 'PENDING') pendingCount++;
  }

  return {
    totalRequests: requests.length,
    approved,
    denied,
    awaitingReview: reviewCount + pendingCount,
    reviewCount,
    pendingCount,
  };
}

export function computeGeographyMetrics(requests: AccessRequest[]): StateActivityMetric[] {
  const map = new Map<string, StateActivityMetric>();

  for (const st of NIGERIA_STATES) {
    map.set(st, {
      state: st,
      total: 0,
      approved: 0,
      denied: 0,
      awaitingReview: 0,
    });
  }

  for (const r of requests) {
    const key = r.stateOrRegion || 'Other';
    let entry = map.get(key);
    if (!entry) {
      entry = {
        state: key,
        total: 0,
        approved: 0,
        denied: 0,
        awaitingReview: 0,
      };
      map.set(key, entry);
    }
    entry.total++;
    if (r.decisionStatus === 'APPROVED') entry.approved++;
    else if (r.decisionStatus === 'DENIED') entry.denied++;
    else entry.awaitingReview++;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function computeDecisionDistribution(requests: AccessRequest[]): DecisionDistribution {
  const summary = computeDashboardSummary(requests);
  const total = summary.totalRequests;
  if (total === 0) {
    return {
      approved: 0,
      denied: 0,
      awaitingReview: 0,
      total: 0,
      approvedPct: 0,
      deniedPct: 0,
      awaitingReviewPct: 0,
    };
  }
  return {
    approved: summary.approved,
    denied: summary.denied,
    awaitingReview: summary.awaitingReview,
    total,
    approvedPct: Math.round((summary.approved / total) * 1000) / 10,
    deniedPct: Math.round((summary.denied / total) * 1000) / 10,
    awaitingReviewPct: Math.round((summary.awaitingReview / total) * 1000) / 10,
  };
}

/**
 * Policy Compliance Rate = Requests meeting all applicable governance requirements
 * / Total evaluated requests * 100.
 * Unresolved (PENDING) requests are excluded from the denominator.
 */
export function computeComplianceMetrics(requests: AccessRequest[]): ComplianceMetrics {
  const evaluated = requests.filter((r) => r.decisionStatus !== 'PENDING');
  const evaluatedTotal = evaluated.length;
  if (evaluatedTotal === 0) {
    return {
      compliantCount: 0,
      evaluatedTotal: 0,
      complianceRate: null,
    };
  }

  const compliantCount = evaluated.filter((r) => r.policyCompliant === true).length;
  const complianceRate = Math.round((compliantCount / evaluatedTotal) * 1000) / 10;

  return {
    compliantCount,
    evaluatedTotal,
    complianceRate,
  };
}

function getMondayWeekStart(isoStr: string): Date | null {
  const ms = Date.parse(isoStr);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function computeActivityTimeline(
  requests: AccessRequest[],
  granularity: 'weekly' | 'daily' = 'weekly',
): ActivityPoint[] {
  const buckets = new Map<string, { isoStart: string; label: string; submitted: number; evaluated: number }>();

  const toKeyAndLabel = (isoStr: string): { key: string; label: string } | null => {
    if (granularity === 'daily') {
      const ms = Date.parse(isoStr);
      if (Number.isNaN(ms)) return null;
      const d = new Date(ms);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      return { key, label };
    }
    const monday = getMondayWeekStart(isoStr);
    if (!monday) return null;
    const key = monday.toISOString().slice(0, 10);
    const label = monday.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return { key, label };
  };

  for (const r of requests) {
    const sub = toKeyAndLabel(r.submittedAt);
    if (sub) {
      const b = buckets.get(sub.key) || { isoStart: sub.key, label: sub.label, submitted: 0, evaluated: 0 };
      b.submitted++;
      buckets.set(sub.key, b);
    }

    if (r.evaluatedAt) {
      const ev = toKeyAndLabel(r.evaluatedAt);
      if (ev) {
        const b = buckets.get(ev.key) || { isoStart: ev.key, label: ev.label, submitted: 0, evaluated: 0 };
        b.evaluated++;
        buckets.set(ev.key, b);
      }
    }
  }

  const sorted = Array.from(buckets.values()).sort((a, b) => a.isoStart.localeCompare(b.isoStart));
  const sliced = granularity === 'daily' ? sorted.slice(-14) : sorted.slice(-10);

  return sliced.map((b) => ({
    bucketLabel: b.label,
    isoStart: b.isoStart,
    submitted: b.submitted,
    evaluated: b.evaluated,
  }));
}
