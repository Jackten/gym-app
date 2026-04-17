import React from 'react';
import { cn } from './cn.js';

// Pelayo input primitive. 16px text (prevents iOS zoom), 2px radius,
// 1px ash border, brass border on focus. Placeholder in oat.

const BASE =
  'w-full bg-espresso text-ivory placeholder:text-oat ' +
  'border border-ash rounded-sm px-4 h-12 text-body ' +
  'transition duration-180 ease-out-quart ' +
  'focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass/40 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const Input = React.forwardRef(function Input(
  { as: Comp = 'input', className, type = 'text', ...rest },
  ref,
) {
  return <Comp ref={ref} type={type} className={cn(BASE, className)} {...rest} />;
});

export default Input;
