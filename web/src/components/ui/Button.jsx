import React from 'react';
import { cn } from './cn.js';

// Pelayo button primitive. Tokens documented in web/docs/brand.md.
// Variants:
//   primary   — brass surface, ivory text (solo CTA)
//   secondary — outline brass on onyx, brass text
//   tertiary  — ivory text with hover underline only
//   danger    — rust surface, ivory text
// Sizes: sm / md / lg. Icon buttons use `iconOnly`.

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium tracking-tight ' +
  'transition duration-180 ease-out-quart ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70 focus-visible:ring-offset-2 focus-visible:ring-offset-onyx ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'active:scale-[0.98] active:transition-none ' +
  'select-none';

const VARIANTS = {
  primary:
    'bg-brass text-onyx shadow-1 hover:bg-brass-gilt hover:text-onyx',
  secondary:
    'border border-brass text-brass bg-transparent hover:bg-brass/10 hover:text-brass-gilt hover:border-brass-gilt',
  tertiary:
    'text-ivory bg-transparent hover:text-brass-gilt underline-offset-4 hover:underline',
  danger:
    'bg-rust text-ivory shadow-1 hover:bg-rust/90',
  ghost:
    'text-oat hover:text-ivory bg-transparent',
};

const SIZES = {
  sm: 'h-9 px-3 text-body-sm rounded-md',
  md: 'h-11 px-5 text-body rounded-md',
  lg: 'h-14 px-7 text-body-lg rounded-md',
};

const ICON_SIZES = {
  sm: 'h-9 w-9 rounded-md',
  md: 'h-11 w-11 rounded-md',
  lg: 'h-14 w-14 rounded-md',
};

const Button = React.forwardRef(function Button(
  {
    as: Comp = 'button',
    variant = 'primary',
    size = 'md',
    iconOnly = false,
    className,
    type,
    children,
    ...rest
  },
  ref,
) {
  const sizing = iconOnly ? ICON_SIZES[size] : SIZES[size];
  const resolvedType = Comp === 'button' ? type || 'button' : type;
  return (
    <Comp
      ref={ref}
      type={resolvedType}
      className={cn(BASE, VARIANTS[variant], sizing, className)}
      {...rest}
    >
      {children}
    </Comp>
  );
});

export default Button;
