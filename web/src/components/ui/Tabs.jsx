import React, { createContext, useContext, useId } from 'react';
import { cn } from './cn.js';

// Pelayo Tabs. Underline pattern — brass active underline, eyebrow-styled labels.
// Controlled: pass `value` + `onValueChange`.
// Uncontrolled: pass `defaultValue` (managed internally).

const TabsContext = createContext(null);

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
  ...rest
}) {
  const [internal, setInternal] = React.useState(defaultValue);
  const active = value !== undefined ? value : internal;
  const setActive = (next) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };
  const id = useId();
  return (
    <TabsContext.Provider value={{ active, setActive, baseId: id }}>
      <div className={cn('w-full', className)} {...rest}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children, ...rest }) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-6 border-b border-ash',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className, children, ...rest }) {
  const ctx = useContext(TabsContext);
  const isActive = ctx.active === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`${ctx.baseId}-${value}`}
      id={`${ctx.baseId}-trigger-${value}`}
      onClick={() => ctx.setActive(value)}
      className={cn(
        'relative -mb-px py-3 text-eyebrow uppercase tracking-[0.12em] transition duration-180 ease-out-quart',
        isActive ? 'text-brass' : 'text-stone hover:text-oat',
        'focus-visible:outline-none focus-visible:text-brass',
        className,
      )}
      {...rest}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 right-0 -bottom-px h-px transition duration-180 ease-out-quart',
          isActive ? 'bg-brass' : 'bg-transparent',
        )}
      />
    </button>
  );
}

export function TabsContent({ value, className, children, ...rest }) {
  const ctx = useContext(TabsContext);
  if (ctx.active !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-${value}`}
      aria-labelledby={`${ctx.baseId}-trigger-${value}`}
      className={cn('pt-6', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Tabs;
