import React from 'react';

/** Reusable glass card wrapper */
export default function GlassCard({ children, className = '', variant = 'glass' }) {
  const cls = variant === 'flat' ? 'glass-card-flat' : 'glass-card';
  return <div className={`${cls} ${className}`}>{children}</div>;
}
