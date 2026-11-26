import React from 'react';

/** Reusable button with variants */
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
