import React, { useState } from 'react';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({ tasks, onTaskClick, className }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      const taskDate = task.start_date ? new Date(task.start_date) : null;
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      return (taskDate && isSameDay(taskDate, date)) || (dueDate && isSameDay(dueDate, date));
    });
  };

  return (
    <div className={cn("", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-surface-100 dark:bg-surface-800">
          {weekDays.map(day => (
            <div
              key={day}
              className="p-2 text-center text-xs font-medium text-surface-500 dark:text-surface-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {/* Empty cells for padding */}
          {Array.from({ length: startPadding }).map((_, i) => (
            <div
              key={`pad-${i}`}
              className="min-h-[80px] border-b border-r border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-900"
            />
          ))}

          {/* Actual days */}
          {daysInMonth.map((date) => {
            const dayTasks = getTasksForDate(date);
            const isToday = isSameDay(date, new Date());

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "min-h-[80px] border-b border-r border-surface-200 p-1 dark:border-surface-700",
                  isToday && "bg-primary-50 dark:bg-primary-900/20"
                )}
              >
                <div className={cn(
                  "mb-1 text-xs font-medium",
                  isToday ? "text-primary-600 dark:text-primary-400" : "text-surface-500"
                )}>
                  {format(date, 'd')}
                </div>

                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={cn(
                        "w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-80",
                        task.category === 'FTC'
                          ? "bg-ftc-orange/20 text-ftc-orange"
                          : "bg-frc-red/20 text-frc-red"
                      )}
                    >
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-surface-500">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-ftc-orange/20" />
          <span>FTC Tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-frc-red/20" />
          <span>FRC Tasks</span>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
