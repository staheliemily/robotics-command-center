import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useMentorTasks } from '../../hooks/useMentorTasks';
import { cn } from '../../lib/utils';

const priorityColors = {
  Low: 'bg-surface-500',
  Medium: 'bg-yellow-500',
  High: 'bg-orange-500',
  Urgent: 'bg-red-500',
};

const statusConfig = {
  'To Do': { icon: Clock, color: 'text-surface-400', bg: 'bg-surface-700' },
  'In Progress': { icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  'Waiting': { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  'Done': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
};

export function MentorTasksSection() {
  const { data: mentorTasks = [], isLoading } = useMentorTasks();

  // Get active tasks (not done)
  const activeTasks = mentorTasks.filter(t => t.status !== 'Done');

  // Sort by priority (Urgent first) then by due date
  const sortedTasks = [...activeTasks].sort((a, b) => {
    const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Then by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date) - new Date(b.due_date);
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  // Take top 6 tasks to display
  const displayTasks = sortedTasks.slice(0, 6);

  // Stats
  const urgentCount = activeTasks.filter(t => t.priority === 'Urgent').length;
  const inProgressCount = activeTasks.filter(t => t.status === 'In Progress').length;
  const waitingCount = activeTasks.filter(t => t.status === 'Waiting').length;
  const todoCount = activeTasks.filter(t => t.status === 'To Do').length;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-surface-700 bg-surface-800/50 p-8">
        <div className="flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-700">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-surface-400" />
          <h3 className="font-semibold text-white">Mentor Tasks</h3>
        </div>
        <Link to="/mentor-tasks">
          <Button variant="ghost" size="sm" className="text-surface-400 hover:text-white">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 p-4 border-b border-surface-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{todoCount}</p>
          <p className="text-xs text-surface-400">To Do</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-400">{inProgressCount}</p>
          <p className="text-xs text-surface-400">In Progress</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-400">{waitingCount}</p>
          <p className="text-xs text-surface-400">Waiting</p>
        </div>
        <div className="text-center">
          <p className={cn("text-2xl font-bold", urgentCount > 0 ? "text-red-400" : "text-surface-400")}>
            {urgentCount}
          </p>
          <p className="text-xs text-surface-400">Urgent</p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="p-4">
        {displayTasks.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-10 w-10 text-surface-600 mb-2" />
            <p className="text-surface-400">No active mentor tasks</p>
            <Link to="/mentor-tasks">
              <Button variant="outline" size="sm" className="mt-3">
                Add Task
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {displayTasks.map((task) => {
              const StatusIcon = statusConfig[task.status]?.icon || Clock;
              const statusColor = statusConfig[task.status]?.color || 'text-surface-400';
              const statusBg = statusConfig[task.status]?.bg || 'bg-surface-700';
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

              return (
                <Link
                  key={task.id}
                  to="/mentor-tasks"
                  className="block rounded-lg border border-surface-700 bg-surface-800 p-3 transition-colors hover:border-surface-600 hover:bg-surface-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {task.priority === 'Urgent' && (
                          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                        <h4 className="font-medium text-white truncate">{task.title}</h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={cn('flex items-center gap-1 rounded px-2 py-0.5', statusBg)}>
                          <StatusIcon className={cn('h-3 w-3', statusColor)} />
                          <span className={statusColor}>{task.status}</span>
                        </span>

                        {task.priority && (
                          <span className="flex items-center gap-1">
                            <span className={cn('h-2 w-2 rounded-full', priorityColors[task.priority])} />
                            <span className="text-surface-400">{task.priority}</span>
                          </span>
                        )}

                        {task.due_date && (
                          <span className={cn(
                            'flex items-center gap-1',
                            isOverdue ? 'text-red-400' : 'text-surface-400'
                          )}>
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}

                        {task.assigned_to && (
                          <span className="text-surface-500">
                            → {task.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {activeTasks.length > 6 && (
              <Link to="/mentor-tasks" className="block text-center">
                <Button variant="ghost" size="sm" className="text-surface-400 hover:text-white">
                  +{activeTasks.length - 6} more tasks
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MentorTasksSection;
