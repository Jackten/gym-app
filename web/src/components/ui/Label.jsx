import React from 'react';
import { cn } from './cn.js';

// Pelayo form label. Eyebrow-styled (uppercase, tracked, brass).
// Use <Label as="span"> for non-input contexts.

const BASE = 'text-eyebrow uppercase tracking-[0.12em] text-brass';

const Label = React.forwardRef(function Label(
  { as: Comp = 'label', className, children, ...rest },
  ref,
) {
  return (
    <Comp ref={ref} className={cn(BASE, className)} {...rest}>
      {children}
    </Comp>
  );
});

export default Label;
