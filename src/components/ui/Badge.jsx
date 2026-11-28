/**
 * @fileoverview Semantic status badges for evidence strength, household effort, and upfront cost tier.
 */

import React from 'react';
import { EVIDENCE_LEVELS, EFFORT_LEVELS, COST_TIERS } from '@/constants';

function Badge({ children, variant = 'gray', icon }) {
  return (
    <span className={`badge badge--${variant}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * Render badge indicating scientific evidence level.
 * @param {{ level: string }} props - Evidence tier key.
 * @returns {JSX.Element} Evidence badge.
 */
export function EvidenceBadge({ level }) {
  const info = EVIDENCE_LEVELS[level] || EVIDENCE_LEVELS.moderate;
  return (
    <Badge variant={info.color} icon={info.icon}>
      {info.label}
    </Badge>
  );
}

/**
 * Render badge indicating implementation effort level.
 * @param {{ level: string }} props - Effort tier key.
 * @returns {JSX.Element} Effort badge.
 */
export function EffortBadge({ level }) {
  const info = EFFORT_LEVELS[level] || EFFORT_LEVELS.medium;
  return (
    <Badge variant={info.color} icon={info.icon}>
      {info.label}
    </Badge>
  );
}

/**
 * Render badge indicating estimated upfront cost bracket.
 * @param {{ tier: string }} props - Cost tier key.
 * @returns {JSX.Element} Cost tier badge.
 */
export function CostBadge({ tier }) {
  const info = COST_TIERS[tier] || COST_TIERS.free;
  return (
    <Badge variant={info.color} icon={info.icon}>
      {info.label}
    </Badge>
  );
}
