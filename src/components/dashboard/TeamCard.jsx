import React, { useState } from 'react';
import { Plus, Clock, User } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../context/AuthContext';
import { useTasks, useUpdateTask } from '../../hooks/useTasks';
import AddTaskModal from '../tasks/AddTaskModal';
import TaskDetailModal from '../tasks/TaskDetailModal';
import { cn } from '../../lib/utils';

const priorityBadgeVariants = {
  Low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function TeamCard({ teamName, category, color = 'blue' }) {
  const { data: allTasks = [] } = useTasks();
  const updateTask = useUpdateTask();
  const { isAdmin } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Filter tasks for this team
  const teamTasks = allTasks.filter(
    task => task.team === teamName && task.category === category
  );

  // Apply filters
  const filteredTasks = teamTasks.filter(task => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'todo' && task.status !== 'Not Started') return false;
      if (statusFilter === 'active' && task.status !== 'In Progress') return false;
      if (statusFilter === 'done' && task.status !== 'Completed') return false;
    }
    if (assigneeFilter !== 'all' && task.assigned_to !== assigneeFilter) return false;
    return true;
  });

  // Get unique assignees
  const assignees = [...new Set(teamTasks.map(t => t.assigned_to).filter(Boolean))];

  // Stats
  const stats = {
    todo: teamTasks.filter(t => t.status === 'Not Started').length,
    active: teamTasks.filter(t => t.status === 'In Progress').length,
    done: teamTasks.filter(t => t.status === 'Completed').length,
  };

  // Group tasks by subsystem/department
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const key = task.department || task.subsystem || 'UNASSIGNED';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const handleToggleComplete = async (task, e) => {
    e.stopPropagation();
    const newStatus = task.status === 'Completed' ? 'Not Started' : 'Completed';
    await updateTask.mutateAsync({ id: task.id, data: { status: newStatus } });
  };

  const colorDot = {
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800/50 overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-surface-700">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0", colorDot[color])} />
          <h3 className="font-semibold text-white text-sm sm:text-base truncate">{teamName}</h3>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Stats - Compact on mobile */}
          <div className="flex items-center gap-1 text-xs">
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-surface-700 text-surface-300">
              {stats.todo}
            </span>
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-blue-500/20 text-blue-400">
              {stats.active}
            </span>
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-green-500/20 text-green-400">
              {stats.done}
            </span>
          </div>

          {/* Add Button */}
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-2 sm:p-3 border-b border-surface-700 bg-surface-800/30">
        <div className="flex items-center gap-1.5 sm:gap-2 text-sm">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 sm:h-8 w-[85px] sm:w-[100px] bg-surface-700 border-surface-600 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          {assignees.length > 0 && (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="h-7 sm:h-8 w-[85px] sm:w-[110px] bg-surface-700 border-surface-600 text-xs">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {assignees.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
        {Object.keys(groupedTasks).length === 0 ? (
          <div className="p-6 text-center text-surface-500 text-sm">
            No tasks yet
          </div>
        ) : (
          Object.entries(groupedTasks).map(([group, tasks]) => (
            <div key={group}>
              {/* Group Header */}
              <div className="px-4 py-2 bg-surface-700/50 text-xs font-medium text-surface-300 uppercase tracking-wide">
                {group}
              </div>

              {/* Tasks */}
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-surface-700/50 hover:bg-surface-700/30 cursor-pointer transition-colors"
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => handleToggleComplete(task, e)}
                    className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                      task.status === 'Completed'
                        ? "bg-green-500 border-green-500"
                        : "border-surface-500 hover:border-surface-400"
                    )}
                  >
                    {task.status === 'Completed' && (
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs sm:text-sm truncate",
                        task.status === 'Completed' ? "text-surface-500 line-through" : "text-white"
                      )}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                      {task.assigned_to && (
                        <span className="text-xs text-surface-400 flex items-center gap-0.5 sm:gap-1">
                          <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          <span className="truncate max-w-[60px] sm:max-w-none">{task.assigned_to}</span>
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-surface-400 flex items-center gap-0.5 sm:gap-1">
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <span className={cn(
                    "px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded border flex-shrink-0",
                    priorityBadgeVariants[task.priority]
                  )}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <AddTaskModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        defaultTeam={teamName}
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

export default TeamCard;
