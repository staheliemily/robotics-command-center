import React from 'react';
import {
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  max,
  min,
} from 'date-fns';
import { cn } from '../../lib/utils';

export function GanttRow({
  label,
  startDate,
  endDate,
  itemStart,
  itemEnd,
  viewMode,
  columnWidth,
  totalColumns,
  color = '#6366f1',
  isMilestone = false,
  status,
  onClick,
}) {
  if (!itemStart || !itemEnd) {
    return (
      <div
        className={cn(
          "relative flex h-10 items-center border-b border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-950",
          onClick && "cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50"
        )}
        onClick={onClick}
        style={{ width: totalColumns * columnWidth }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-xs text-surface-400">
          No dates set
        </div>
      </div>
    );
  }

  const getOffset = () => {
    const clampedStart = max([itemStart, startDate]);
    switch (viewMode) {
      case 'day':
        return differenceInDays(clampedStart, startDate);
      case 'week':
        return differenceInWeeks(clampedStart, startDate);
      case 'month':
        return differenceInMonths(clampedStart, startDate);
      default:
        return differenceInDays(clampedStart, startDate);
    }
  };

  const getWidth = () => {
    const clampedStart = max([itemStart, startDate]);
    const clampedEnd = min([itemEnd, endDate]);
    switch (viewMode) {
      case 'day':
        return Math.max(1, differenceInDays(clampedEnd, clampedStart) + 1);
      case 'week':
        return Math.max(1, differenceInWeeks(clampedEnd, clampedStart) + 1);
      case 'month':
        return Math.max(1, differenceInMonths(clampedEnd, clampedStart) + 1);
      default:
        return Math.max(1, differenceInDays(clampedEnd, clampedStart) + 1);
    }
  };

  const offset = getOffset();
  const width = getWidth();

  const getStatusOpacity = () => {
    switch (status) {
      case 'Completed':
        return '1';
      case 'In Progress':
        return '0.85';
      case 'Blocked':
        return '0.7';
      default:
        return '0.6';
    }
  };

  const getStatusPattern = () => {
    if (status === 'Completed') {
      return null;
    }
    if (status === 'Blocked') {
      return 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 6px)';
    }
    return null;
  };

  return (
    <div
      className={cn(
        "relative flex h-10 items-center border-b border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-950",
        onClick && "cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50"
      )}
      onClick={onClick}
      style={{ width: totalColumns * columnWidth }}
    >
      {/* Grid lines */}
      {Array.from({ length: totalColumns }).map((_, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 border-r border-surface-100 dark:border-surface-800"
          style={{ left: i * columnWidth, width: columnWidth }}
        />
      ))}

      {/* Bar */}
      <div
        className={cn(
          "absolute top-2 h-6 rounded transition-all",
          isMilestone ? "font-medium" : "",
          status === 'Completed' && "opacity-100"
        )}
        style={{
          left: offset * columnWidth + 4,
          width: width * columnWidth - 8,
          backgroundColor: color,
          opacity: getStatusOpacity(),
          backgroundImage: getStatusPattern(),
        }}
      >
        <span
          className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white truncate"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export default GanttRow;
