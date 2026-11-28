/**
 * @fileoverview UI badge definitions for scientific evidence, household effort, cost tiers, and priorities.
 */

export const EVIDENCE_LEVELS = {
  strong: {
    label: 'Strong Evidence',
    color: 'green',
    icon: '✓✓',
    description: 'Supported by multiple peer-reviewed studies or reviews',
  },
  moderate: {
    label: 'Moderate Evidence',
    color: 'blue',
    icon: '✓',
    description: 'Supported by published studies and consensus guidance',
  },
  limited: {
    label: 'Limited Evidence',
    color: 'yellow',
    icon: '~',
    description: 'Weak or non-primary effect in real-world homes',
  },
  myth_busted: {
    label: 'Myth Busted',
    color: 'red',
    icon: '✗',
    description: 'Not supported by scientific evidence',
  },
};

export const EFFORT_LEVELS = {
  low: { label: 'Low Effort', color: 'green', icon: '⚡', description: 'Quick habit change' },
  medium: {
    label: 'Medium Effort',
    color: 'blue',
    icon: '⚡⚡',
    description: 'Requires planning or routine shift',
  },
  high: {
    label: 'High Effort',
    color: 'yellow',
    icon: '⚡⚡⚡',
    description: 'Major purchase or structural change',
  },
};

export const COST_TIERS = {
  free: { label: 'Free', color: 'green', icon: '₹0', description: 'No upfront spend' },
  under_500: {
    label: 'Under ₹500',
    color: 'green',
    icon: '₹',
    description: 'Low cost (estimate, verify locally)',
  },
  under_5000: {
    label: 'Under ₹5,000',
    color: 'blue',
    icon: '₹₹',
    description: 'Moderate cost (estimate, verify locally)',
  },
  above_5000: {
    label: '₹5,000+',
    color: 'yellow',
    icon: '₹₹₹',
    description: 'Higher investment (estimate, verify locally)',
  },
};

export const PRIORITY_TIERS = {
  do_now: { label: 'Do now (free)', order: 1, icon: '⚡', badge: 'green' },
  today: { label: 'Today', order: 2, icon: '🗓️', badge: 'teal' },
  this_week: { label: 'This week (low cost)', order: 3, icon: '🛠️', badge: 'blue' },
  later: { label: 'Later (investment)', order: 4, icon: '🏡', badge: 'yellow' },
};
