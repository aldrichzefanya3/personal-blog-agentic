import React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({
  size = 'md',
  className = '',
  ...props
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block ${className}`}
      {...props}
    >
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent`}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
