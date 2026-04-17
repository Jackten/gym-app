import React from 'react';
import { cn } from './cn.js';

// Small section marker — uppercase, tracked 0.12em, brass.
// Pair with a display-serif heading directly below.

export default function Eyebrow({
  as: Comp = 'span',
  className,
  children,
  ...rest
}) {
  return (
    <Comp
      className={cn(
        'text-eyebrow uppercase tracking-[0.12em] text-brass font-medium',
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}
