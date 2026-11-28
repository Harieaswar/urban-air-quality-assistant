/**
 * @fileoverview Reusable styled button primitive supporting primary, secondary, and ghost variants.
 */

import React from 'react';

/**
 * Render an accessible styled button element.
 * @param {Object} props - Button label, visual variant, icon, type, disabled state, and click handler.
 * @returns {JSX.Element} Styled button element.
 */
export default function Button({
  children,
  variant = 'primary',
  onClick,
  disabled,
  icon,
  className = '',
  type = 'button',
}) {
  return (
    <button
      className={`btn btn--${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
