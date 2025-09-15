"use client";

import * as React from 'react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2';
    const variants: Record<string, string> = {
      default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400',
      outline: 'border border-gray-300 hover:bg-gray-50',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    };
    return <button ref={ref} className={clsx(base, variants[variant], className)} {...props} />;
  }
);
Button.displayName = 'Button';
