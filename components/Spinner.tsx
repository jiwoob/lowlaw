import React from 'react';

// FIX: Add size prop to allow for different spinner sizes.
interface SpinnerProps {
  size?: 'sm' | 'md';
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
  };

  return (
    <div 
        className={`animate-spin rounded-full border-2 border-slate-300 border-t-transparent ${sizeClasses[size]}`}
        role="status"
        aria-live="polite"
    >
        <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;