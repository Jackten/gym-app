import React from 'react';
import { cn } from './cn.js';

// Pelayo Card primitive. Espresso surface, ash hairline, 8px radius, 24px padding.
// `feature` adds a 1px brass top-border — reserved for hero / selected cards.

const BASE =
  'bg-espresso border border-ash rounded-lg shadow-2 ' +
  'transition duration-180 ease-out-quart';

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = React.forwardRef(function Card(
  { as: Comp = 'div', feature = false, padding = 'md', className, children, ...rest },
  ref,
) {
  return (
    <Comp
      ref={ref}
      className={cn(
        BASE,
        PADDING[padding],
        feature && 'border-t-brass',
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
});

export function CardHeader({ className, children, ...rest }) {
  return (
    <div className={cn('mb-4 flex flex-col gap-1', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardEyebrow({ className, children, ...rest }) {
  return (
    <span
      className={cn(
        'text-eyebrow uppercase tracking-[0.12em] text-brass',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export function CardTitle({ as: Comp = 'h3', className, children, ...rest }) {
  return (
    <Comp
      className={cn('font-display font-light text-h3 text-ivory', className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function CardBody({ className, children, ...rest }) {
  return (
    <div className={cn('text-body text-oat', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }) {
  return (
    <div
      className={cn('mt-6 flex items-center justify-between gap-4', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
