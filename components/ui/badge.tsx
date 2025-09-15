import * as React from 'react';
import clsx from 'clsx';

export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' }) {
  const variants = {
    default: 'bg-green-100 text-green-800 border-green-200',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200',
  } as const;
  return <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', variants[variant], className)} {...props} />;
}
