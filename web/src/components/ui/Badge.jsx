import React from 'react';
import { cn } from './cn.js';

// Pelayo Badge primitive. Small status pill.
// Variants: neutral (ash), brass (accent), success (olive), danger (rust), muted (stone).

const BASE =
  'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 ' +
  'text-eyebrow uppercase tracking-[0.12em] font-medium';

const VARIANTS = {
  neutral: 'bg-ash text-oat border border-ash',
  brass: 'bg-brass/15 text-brass-gilt border border-brass/40',
  success: 'bg-olive/15 text-olive border border-olive/40',
  danger: 'bg-rust/15 text-rust border border-rust/40',
  muted: 'bg-transparent text-stone border border-ash',
};

const Badge = React.forwardRef(function Badge(
  { variant = 'neutral', className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(BASE, VARIANTS[variant], className)}
      {...rest}
    >
      {children}
    </span>
  );
});

export default Badge;
