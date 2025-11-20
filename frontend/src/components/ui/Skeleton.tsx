import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (lines && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]} ${index < lines - 1 ? 'mb-2' : ''}`}
            style={index === lines - 1 ? style : { width: width || '100%', height: height || '16px' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Pre-built skeleton components
export const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
    <Skeleton variant="rectangular" height={24} width="60%" className="mb-4" />
    <Skeleton lines={3} />
  </div>
);

export const SkeletonMatchCard = () => (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        <Skeleton variant="rectangular" height={20} width="70%" className="mb-2" />
        <Skeleton variant="rectangular" height={16} width="50%" />
      </div>
      <Skeleton variant="rectangular" height={24} width={80} />
    </div>
    <Skeleton lines={4} />
    <Skeleton variant="rectangular" height={40} width="100%" className="mt-4" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
    <div className="p-4 border-b border-gray-200">
      <Skeleton variant="rectangular" height={20} width="30%" />
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="p-4 flex items-center space-x-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton variant="rectangular" height={16} width="40%" className="mb-2" />
            <Skeleton variant="rectangular" height={14} width="60%" />
          </div>
          <Skeleton variant="rectangular" height={32} width={100} />
        </div>
      ))}
    </div>
  </div>
);

