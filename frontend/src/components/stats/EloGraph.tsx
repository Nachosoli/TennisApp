'use client';

import { useMemo, useState, useEffect } from 'react';
import { EloHistoryEntry } from '@/lib/stats';

interface EloGraphProps {
  data: EloHistoryEntry[];
  height?: number;
}

export function EloGraph({ data, height = 300 }: EloGraphProps) {
  const [graphWidth, setGraphWidth] = useState(800);

  useEffect(() => {
    const updateWidth = () => {
      setGraphWidth(Math.min(800, window.innerWidth - 80));
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Sort data by date (oldest first)
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [data]);

  if (sortedData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No ELO history available</p>
      </div>
    );
  }

  // Calculate dimensions
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const graphHeight = height;
  const innerWidth = graphWidth - padding.left - padding.right;
  const innerHeight = graphHeight - padding.top - padding.bottom;

  // Calculate cumulative ELO starting from 1500
  const initialElo = 1500;
  let currentElo = initialElo;
  const cumulativeElos = [initialElo];
  
  sortedData.forEach((entry) => {
    const eloChange = entry.eloAfter - entry.eloBefore;
    currentElo = currentElo + eloChange;
    cumulativeElos.push(currentElo);
  });

  // Calculate min/max ELO values for scaling (always include 1500 and all cumulative values)
  const minElo = Math.min(...cumulativeElos);
  const maxElo = Math.max(...cumulativeElos);
  const eloRange = maxElo - minElo || 100; // Avoid division by zero
  
  // Add some padding to the range
  const paddedMin = minElo - eloRange * 0.1;
  const paddedMax = maxElo + eloRange * 0.1;
  const paddedRange = paddedMax - paddedMin;

  // Scale function for Y axis (ELO)
  const scaleY = (elo: number) => {
    return innerHeight - ((elo - paddedMin) / paddedRange) * innerHeight;
  };

  // Scale function for X axis (dates)
  // We have sortedData.length + 1 points (1500 at index 0, then each match result)
  const scaleX = (index: number) => {
    const totalPoints = sortedData.length + 1;
    return (index / (totalPoints - 1 || 1)) * innerWidth;
  };

  // Generate path for the line
  const generatePath = () => {
    if (sortedData.length === 0) return '';
    
    // Always start from 1500 (initial ELO)
    let path = `M ${padding.left + scaleX(0)} ${padding.top + scaleY(initialElo)}`;
    
    // Calculate cumulative ELO starting from 1500
    let currentElo = initialElo;
    sortedData.forEach((entry, index) => {
      // Calculate the ELO change for this match
      const eloChange = entry.eloAfter - entry.eloBefore;
      // Add the change to current ELO
      currentElo = currentElo + eloChange;
      
      const x = padding.left + scaleX(index + 1); // +1 because first point is at index 0
      const y = padding.top + scaleY(currentElo);
      path += ` L ${x} ${y}`;
    });
    
    return path;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  };

  // Format ELO value
  const formatElo = (elo: number) => {
    return Math.round(elo).toString();
  };

  return (
    <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <svg
        width={graphWidth}
        height={graphHeight}
        className="w-full"
        viewBox={`0 0 ${graphWidth} ${graphHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + innerHeight * ratio;
          const elo = paddedMax - paddedRange * ratio;
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerWidth}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fill="#6B7280"
                fontSize="12"
                textAnchor="end"
                fontWeight="500"
              >
                {formatElo(elo)}
              </text>
            </g>
          );
        })}

        {/* X-axis date labels */}
        {sortedData.map((entry, index) => {
          // Only show every Nth label to avoid crowding
          const showLabel = sortedData.length <= 10 || 
                           index === 0 || 
                           index === sortedData.length - 1 ||
                           index % Math.ceil(sortedData.length / 8) === 0;
          
          if (!showLabel) return null;
          
          const x = padding.left + scaleX(index + 1); // +1 because first point (1500) is at index 0
          return (
            <g key={`date-${index}`}>
              <line
                x1={x}
                y1={padding.top + innerHeight}
                x2={x}
                y2={padding.top + innerHeight + 5}
                stroke="#D1D5DB"
                strokeWidth="1"
              />
              <text
                x={x}
                y={padding.top + innerHeight + 20}
                fill="#6B7280"
                fontSize="11"
                textAnchor="middle"
                fontWeight="500"
                transform={`rotate(-45 ${x} ${padding.top + innerHeight + 20})`}
              >
                {formatDate(entry.createdAt)}
              </text>
            </g>
          );
        })}

        {/* Main line */}
        <path
          d={generatePath()}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Gradient area under the line */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Area fill under the line */}
        {sortedData.length > 0 && (() => {
          // Always start from 1500
          let areaPath = `M ${padding.left + scaleX(0)} ${padding.top + scaleY(initialElo)}`;
          
          let currentElo = initialElo;
          sortedData.forEach((entry, index) => {
            const eloChange = entry.eloAfter - entry.eloBefore;
            currentElo = currentElo + eloChange;
            const x = padding.left + scaleX(index + 1);
            const y = padding.top + scaleY(currentElo);
            areaPath += ` L ${x} ${y}`;
          });
          
          areaPath += ` L ${padding.left + scaleX(sortedData.length)} ${padding.top + innerHeight}`;
          areaPath += ` L ${padding.left + scaleX(0)} ${padding.top + innerHeight} Z`;
          return (
            <path
              d={areaPath}
              fill="url(#lineGradient)"
            />
          );
        })()}

        {/* Data points */}
        {sortedData.map((entry, index) => {
          // Calculate cumulative ELO for this point
          let currentElo = initialElo;
          for (let i = 0; i <= index; i++) {
            const eloChange = sortedData[i].eloAfter - sortedData[i].eloBefore;
            currentElo = currentElo + eloChange;
          }
          
          const x = padding.left + scaleX(index + 1); // +1 because first point is at index 0
          const y = padding.top + scaleY(currentElo);
          const eloChange = entry.eloAfter - entry.eloBefore;
          
          return (
            <g key={`point-${index}`}>
              {/* Point circle */}
              <circle
                cx={x}
                cy={y}
                r="5"
                fill={eloChange >= 0 ? "#10B981" : "#EF4444"}
                stroke="white"
                strokeWidth="2"
              />
              
              {/* ELO value label above point */}
              <text
                x={x}
                y={y - 12}
                fill={eloChange >= 0 ? "#059669" : "#DC2626"}
                fontSize="12"
                textAnchor="middle"
                fontWeight="600"
              >
                {formatElo(currentElo)}
              </text>
              
              {/* Tooltip on hover - using title for accessibility */}
              <title>
                {formatDate(entry.createdAt)}: {formatElo(currentElo)} ({eloChange >= 0 ? '+' : ''}{eloChange.toFixed(1)})
              </title>
            </g>
          );
        })}

        {/* Start point (always 1500) */}
        <g>
          <circle
            cx={padding.left + scaleX(0)}
            cy={padding.top + scaleY(initialElo)}
            r="5"
            fill="#3B82F6"
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={padding.left + scaleX(0)}
            y={padding.top + scaleY(initialElo) - 12}
            fill="#2563EB"
            fontSize="12"
            textAnchor="middle"
            fontWeight="600"
          >
            {formatElo(initialElo)}
          </text>
        </g>
      </svg>
    </div>
  );
}

