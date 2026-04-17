import React from 'react';
import { cn } from './cn.js';

// Inline Pelayo wordmark. Inherits currentColor so it can be tinted by parent class.
// Default tint is ivory. See web/public/brand/wordmark.svg for the canonical file.

export default function Wordmark({ className, title = 'Pelayo', ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 480 80"
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
      className={cn('text-ivory', className)}
      {...rest}
    >
      <title>{title}</title>
      <text
        x="50%"
        y="55"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        style={{
          fontFamily:
            '"Playfair Display", "Canela Deck", "Migra", Georgia, serif',
          fontWeight: 300,
          fontSize: 56,
          letterSpacing: '0.32em',
        }}
      >
        PELAYO
      </text>
    </svg>
  );
}
