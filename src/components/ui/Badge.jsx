import React from 'react';
import { EVIDENCE_LEVELS, EFFORT_LEVELS, COST_TIERS } from '@/data/constants';

/** Generic badge */
export default function Badge({ children, variant = 'gray', icon }) {
  return (
    <span className={`badge badge--${variant}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

/** Evidence level badge */
export function EvidenceBadge({ level }) {
  const info = EVIDENCE_LEVELS[level] || EVIDENCE_LEVELS.moderate;
  return (
    <Badge variant={info.color} icon={info.icon}>
      {info.label}
    </Badge>
  );
}

/** Effort level badge */
export function EffortBadge({ level }) {
  const info = EFFORT_LEVELS[level] || EFFORT_LEVELS.medium;
  return (
    <Badge variant={info.color} icon={info.icon}>
      {info.label}
    </Badge>
  );
}

/** Cost tier badge */
export function CostBadge({ tier }) {
  const info = COST_TIERS[tier] || COST_TIERS.free;
  return (
    <Badge variant={info.color} icon={info.icon}>
      {info.label}
    </Badge>
  );
}
