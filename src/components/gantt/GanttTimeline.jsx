import React from 'react';
import {
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  endOfWeek,
  isToday,
  isWeekend,
} from 'date-fns';
import { cn } from '../../lib/utils';

export function GanttTimeline({ startDate, endDate, viewMode, columnWidth }) {
  const getColumns = () => {
    switch (viewMode) {
      case 'day':
        return eachDayOfInterval({ start: startDate, end: endDate });
      case 'week':
        return eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 0 });
      case 'month':
        return eachMonthOfInterval({ start: startDate, end: endDate });
      default:
        return eachDayOfInterval({ start: startDate, end: endDate });
    }
  };

  const columns = getColumns();

  const formatHeader = (date) => {
    switch (viewMode) {
      case 'day':
        return format(date, 'd');
      case 'week':
        return `${format(date, 'MMM d')}`;
      case 'month':
        return format(date, 'MMM yyyy');
      default:
        return format(date, 'd');
    }
  };

  const formatSubHeader = (date) => {
    switch (viewMode) {
      case 'day':
        return format(date, 'EEE');
      case 'week':
        return `${format(endOfWeek(date), 'd')}`;
      case 'month':
        return '';
      default:
        return format(date, 'EEE');
    }
  };

  return (
    <div className="flex border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-900">
      {columns.map((date, index) => {
        const isCurrentDay = viewMode === 'day' && isToday(date);
        const isWeekendDay = viewMode === 'day' && isWeekend(date);

        return (
          <div
            key={index}
            className={cn(
              "flex-shrink-0 border-r border-surface-200 dark:border-surface-700 text-center",
              isCurrentDay && "bg-primary-100 dark:bg-primary-900/30",
              isWeekendDay && !isCurrentDay && "bg-surface-100 dark:bg-surface-800/50"
            )}
            style={{ width: columnWidth }}
          >
            <div className="py-1 text-xs font-medium text-surface-900 dark:text-surface-100">
              {formatHeader(date)}
            </div>
            {viewMode !== 'month' && (
              <div className="pb-1 text-xs text-surface-500">
                {formatSubHeader(date)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default GanttTimeline;
