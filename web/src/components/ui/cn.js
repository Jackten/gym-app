import clsx from 'clsx';

// Small alias so component files can import a consistent helper name.
// Extended via twMerge later if/when conflicts appear.
export function cn(...inputs) {
  return clsx(inputs);
}
