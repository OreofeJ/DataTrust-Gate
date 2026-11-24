import React from 'react';
import { DecisionStatus } from '../types/governance';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * Custom geometric DataTrust Gate mark:
 * - Outer octagonal boundary (protected health data perimeter)
 * - Four connected community nodes (shared stewardship)
 * - Central gate aperture (deterministic access control)
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 34, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DataTrust Gate brand mark"
    >
      {/* Protected Data Boundary */}
      <polygon
        points="13,3 27,3 37,13 37,27 27,37 13,37 3,27 3,13"
        stroke="#0F1C2E"
        strokeWidth="1.75"
        fill="#FFFFFF"
      />
      {/* Controlled Access Pathways */}
      <line x1="20" y1="6" x2="20" y2="14" stroke="#1F6E72" strokeWidth="1.5" />
      <line x1="20" y1="26" x2="20" y2="34" stroke="#1F6E72" strokeWidth="1.5" />
      <line x1="6" y1="20" x2="14" y2="20" stroke="#1F6E72" strokeWidth="1.5" />
      <line x1="26" y1="20" x2="34" y2="20" stroke="#1F6E72" strokeWidth="1.5" />

      {/* Central Gate Aperture */}
      <polygon
        points="20,12 28,20 20,28 12,20"
        fill="#EAF3F3"
        stroke="#1F6E72"
        strokeWidth="1.75"
      />
      <rect x="17.5" y="17.5" width="5" height="5" rx="1" fill="#0F1C2E" />

      {/* Connected Community Nodes */}
      <circle cx="20" cy="6" r="2.2" fill="#0F1C2E" />
      <circle cx="20" cy="34" r="2.2" fill="#0F1C2E" />
      <circle cx="6" cy="20" r="2.2" fill="#1F6E72" />
      <circle cx="34" cy="20" r="2.2" fill="#1F6E72" />
    </svg>
  );
};

interface DecisionIndicatorProps {
  status: DecisionStatus | string;
}

export const DecisionIndicator: React.FC<DecisionIndicatorProps> = ({ status }) => {
  const normalized = status.toUpperCase();
  if (normalized === 'APPROVED' || normalized === 'ACTIVE' || normalized === 'VALID') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#176252] whitespace-nowrap">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <polygon points="5,0.5 9.5,5 5,9.5 0.5,5" fill="#176252" />
        </svg>
        <span>{status}</span>
      </span>
    );
  }
  if (normalized === 'DENIED' || normalized === 'REVOKED' || normalized === 'INACTIVE' || normalized === 'SUSPENDED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E2A2B] whitespace-nowrap">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="#9E2A2B" strokeWidth="1.6" />
          <line x1="2.5" y1="2.5" x2="7.5" y2="7.5" stroke="#9E2A2B" strokeWidth="1.4" />
        </svg>
        <span>{status}</span>
      </span>
    );
  }
  if (normalized === 'REVIEW' || normalized === 'EXPIRED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B4690E] whitespace-nowrap">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <polygon points="5,1 9.5,8.5 0.5,8.5" fill="none" stroke="#B4690E" strokeWidth="1.5" />
        </svg>
        <span>{status}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] whitespace-nowrap">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <circle cx="5" cy="5" r="3.5" fill="none" stroke="#64748B" strokeWidth="1.5" />
      </svg>
      <span>{status}</span>
    </span>
  );
};
