/**
 * @fileoverview Glassmorphic and solid surface card wrapper component.
 */

import React from 'react';

/**
 * Render a themed card surface (`glass` backdrop blur or `flat` solid border variant).
 * @param {{ children: React.ReactNode, className?: string, variant?: 'glass'|'flat' }} props - Card props.
 * @returns {JSX.Element} Container element.
 */
export default function GlassCard({ children, className = '', variant = 'glass' }) {
  const cls = variant === 'flat' ? 'glass-card-flat' : 'glass-card';
  return <div className={`${cls} ${className}`}>{children}</div>;
}
