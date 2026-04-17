import React from 'react';
import { cn } from './cn.js';

// 1px hairline divider. `muted` drops to a softer tone.

export default function Separator({
  orientation = 'horizontal',
  muted = false,
  className,
  ...rest
}) {
  const base =
    orientation === 'vertical' ? 'w-px h-full' : 'h-px w-full';
  const tone = muted ? 'bg-ash/60' : 'bg-ash';
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(base, tone, className)}
      {...rest}
    />
  );
}
