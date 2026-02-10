import React, { useState } from 'react';
import { Plus, Calendar as CalendarIcon, List, Filter } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import TaskCard from '../tasks/TaskCard';
import AddTaskModal from '../tasks/AddTaskModal';
import TaskDetailModal from '../tasks/TaskDetailModal';
import CalendarView from '../tasks/CalendarView';
import { cn } from '../../lib/utils';

const views = {
  list: List,
  calendar: CalendarIcon,
};

export function TeamTaskGrid({ team, category, className }) {
  const { data: allTasks = [], isLoading } = useTasks();
  const { isAdmin } = useAuth();
  const [view, setView] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter tasks by team and category
  const tasks = allTasks.filter(task => {
    const matchesTeam = !team || task.team === team;
    const matchesCategory = !category || task.category === category;
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesTeam && matchesCategory && matchesStatus;
  });

  const statusCounts = {
    all: allTasks.filter(t => (!team || t.team === team) && (!category || t.category === category)).length,
    'Not Started': allTasks.filter(t => t.status === 'Not Started' && (!team || t.team === team) && (!category || t.category === category)).length,
    'In Progress': allTasks.filter(t => t.status === 'In Progress' && (!team || t.team === team) && (!category || t.category === category)).length,
    'Blocked': allTasks.filter(t => t.status === 'Blocked' && (!team || t.team === team) && (!category || t.category === category)).length,
    'Completed': allTasks.filter(t => t.status === 'Completed' && (!team || t.team === team) && (!category || t.category === category)).length,
  };

  if (isLoading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 md:p-6", className)}>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === status
                  ? "bg-primary-600 text-white"
                  : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
              )}
            >
              {status === 'all' ? 'All' : status} ({count})
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-surface-200 dark:border-surface-700">
            {Object.entries(views).map(([key, Icon]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  "p-2 transition-colors",
                  view === key
                    ? "bg-primary-600 text-white"
                    : "text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800",
                  key === 'list' && "rounded-l-lg",
                  key === 'calendar' && "rounded-r-lg"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {/* Add Task Button */}
          {isAdmin && (
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Task</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {view === 'list' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.length === 0 ? (
            <div className="col-span-full py-12 text-center text-surface-500">
              No tasks found. {isAdmin && 'Click "Add Task" to create one.'}
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
              />
            ))
          )}
        </div>
      ) : (
        <CalendarView
          tasks={tasks}
          onTaskClick={(task) => setSelectedTask(task)}
        />
      )}

      {/* Modals */}
      <AddTaskModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        defaultTeam={team}
        defaultCategory={category}
      />

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </div>
  );
}

export default TeamTaskGrid;
