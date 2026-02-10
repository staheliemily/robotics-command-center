import React from 'react';
import { Clock, AlertTriangle, User, Users } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

const priorityVariants = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical',
};

const statusVariants = {
  'Not Started': 'pending',
  'In Progress': 'inProgress',
  'Blocked': 'blocked',
  'Completed': 'completed',
};

export function TaskCard({ task, onClick, className }) {
  const {
    title,
    description,
    team,
    category,
    department,
    assigned_to,
    start_date,
    due_date,
    status,
    priority,
    needs_mentor,
  } = task;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
        status === 'Completed' && "opacity-75",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header with badges */}
        <div className="mb-3 flex flex-wrap items-start gap-2">
          <Badge variant={category === 'FTC' ? 'ftc' : 'frc'}>
            {category}
          </Badge>
          <Badge variant={priorityVariants[priority]}>
            {priority}
          </Badge>
          {needs_mentor && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Mentor
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className={cn(
          "mb-2 font-semibold line-clamp-2",
          status === 'Completed' && "line-through opacity-70"
        )}>
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="mb-3 text-sm text-surface-500 dark:text-surface-400 line-clamp-2">
            {description}
          </p>
        )}

        {/* Meta info */}
        <div className="space-y-2 text-xs text-surface-500 dark:text-surface-400">
          {/* Team & Department */}
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            <span>{team}</span>
            {department && (
              <>
                <span className="text-surface-300 dark:text-surface-600">•</span>
                <span>{department}</span>
              </>
            )}
          </div>

          {/* Assigned to */}
          {assigned_to && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              <span>{assigned_to}</span>
            </div>
          )}

          {/* Dates */}
          {(start_date || due_date) && (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              {start_date && <span>{formatDate(start_date)}</span>}
              {start_date && due_date && <span>→</span>}
              {due_date && <span>{formatDate(due_date)}</span>}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
          <Badge variant={statusVariants[status]} className="w-full justify-center">
            {status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default TaskCard;
