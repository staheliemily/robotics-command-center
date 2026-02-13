import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Trash2,
  Edit2,
  GraduationCap,
  Wrench,
  DollarSign,
  FileText,
  Calendar,
  MessageSquare,
  Truck,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import ThemeToggle from '../components/dashboard/ThemeToggle';
import { useMentorTasks, useDeleteMentorTask } from '../hooks/useMentorTasks';
import { useAuth } from '../context/AuthContext';
import AddMentorTaskModal from '../components/mentor/AddMentorTaskModal';
import { cn } from '../lib/utils';

const priorityColors = {
  Low: 'bg-surface-500',
  Medium: 'bg-yellow-500',
  High: 'bg-orange-500',
  Urgent: 'bg-red-500',
};

const statusConfig = {
  'To Do': { icon: Clock, color: 'text-surface-500', bg: 'bg-surface-500/10' },
  'In Progress': { icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'Waiting': { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  'Done': { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
};

const categoryConfig = {
  'Training & Teaching': {
    icon: GraduationCap,
    color: 'from-violet-500 to-violet-600',
    description: 'Student training, workshops, skill development',
  },
  'Technical Support': {
    icon: Wrench,
    color: 'from-blue-500 to-blue-600',
    description: 'Robot help, debugging, technical guidance',
  },
  'Fundraising & Sponsors': {
    icon: DollarSign,
    color: 'from-emerald-500 to-emerald-600',
    description: 'Grant writing, sponsor outreach, donations',
  },
  'Administrative': {
    icon: FileText,
    color: 'from-slate-500 to-slate-600',
    description: 'Paperwork, registrations, forms',
  },
  'Event Planning': {
    icon: Calendar,
    color: 'from-pink-500 to-pink-600',
    description: 'Competitions, outreach events, meetings',
  },
  'Communication': {
    icon: MessageSquare,
    color: 'from-cyan-500 to-cyan-600',
    description: 'Parent updates, team announcements, emails',
  },
  'Logistics': {
    icon: Truck,
    color: 'from-amber-500 to-amber-600',
    description: 'Transportation, supplies, equipment',
  },
};

export function MentorTasks() {
  const { data: mentorTasks = [], isLoading } = useMentorTasks();
  const deleteTask = useDeleteMentorTask();
  const { isAdmin } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [defaultCategory, setDefaultCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filter tasks
  const filteredTasks = mentorTasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    return true;
  });

  // Group by category
  const categoryNames = Object.keys(categoryConfig);
  const groupedByCategory = categoryNames.reduce((acc, category) => {
    acc[category] = filteredTasks.filter(t => t.category === category);
    return acc;
  }, {});

  // Uncategorized tasks
  const uncategorized = filteredTasks.filter(t => !t.category || !categoryNames.includes(t.category));

  // Stats
  const statusGroups = {
    'To Do': mentorTasks.filter(t => t.status === 'To Do'),
    'In Progress': mentorTasks.filter(t => t.status === 'In Progress'),
    'Waiting': mentorTasks.filter(t => t.status === 'Waiting'),
    'Done': mentorTasks.filter(t => t.status === 'Done'),
  };

  const urgentCount = mentorTasks.filter(t => t.priority === 'Urgent' && t.status !== 'Done').length;

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setDefaultCategory(task.category || null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTask(null);
    setDefaultCategory(null);
  };

  const handleAddToCategory = (category) => {
    setDefaultCategory(category);
    setShowAddModal(true);
  };

  const renderTaskCard = (task) => {
    const StatusIcon = statusConfig[task.status]?.icon || Clock;
    const statusColor = statusConfig[task.status]?.color || 'text-surface-500';
    const statusBg = statusConfig[task.status]?.bg || 'bg-surface-500/10';

    return (
      <Card key={task.id} className="group relative overflow-hidden">
        <CardContent className="p-4">
          {/* Status & Priority */}
          <div className="mb-3 flex items-center justify-between">
            <div className={cn('flex items-center gap-2 rounded-full px-3 py-1', statusBg)}>
              <StatusIcon className={cn('h-4 w-4', statusColor)} />
              <span className={cn('text-sm font-medium', statusColor)}>
                {task.status}
              </span>
            </div>
            {task.priority && (
              <div className="flex items-center gap-1.5">
                <div className={cn('h-2 w-2 rounded-full', priorityColors[task.priority])} />
                <span className="text-xs text-surface-500">{task.priority}</span>
              </div>
            )}
          </div>

          {/* Task Title */}
          <h3 className="mb-2 text-lg font-semibold text-surface-900 dark:text-surface-100">
            {task.title}
          </h3>

          {/* Description */}
          {task.description && (
            <p className="mb-3 line-clamp-2 text-sm text-surface-600 dark:text-surface-400">
              {task.description}
            </p>
          )}

          {/* Assigned To & Due Date */}
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {task.assigned_to && (
              <span className="rounded bg-surface-100 px-2 py-1 dark:bg-surface-800">
                <Users className="mr-1 inline h-3 w-3" />
                {task.assigned_to}
              </span>
            )}
            {task.due_date && (
              <span className="rounded bg-surface-100 px-2 py-1 dark:bg-surface-800">
                <Calendar className="mr-1 inline h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Notes */}
          {task.notes && (
            <p className="mb-3 rounded bg-surface-100 p-2 text-xs text-surface-600 dark:bg-surface-800 dark:text-surface-400">
              {task.notes}
            </p>
          )}

          {/* Actions */}
          {isAdmin && (
            <div className="flex gap-2 border-t border-surface-200 pt-3 dark:border-surface-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(task)}
                className="flex-1"
              >
                <Edit2 className="mr-1 h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(task.id)}
                className="flex-1 text-red-500 hover:text-red-600"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-surface-600 dark:text-surface-400">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                  Mentor Tasks
                </h1>
                <p className="text-xs text-surface-500">Track mentor action items</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAdmin && (
              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Task</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-500/10">
                <Clock className="h-6 w-6 text-surface-500" />
              </div>
              <div>
                <p className="text-sm text-surface-500">To Do</p>
                <p className="text-2xl font-bold">{statusGroups['To Do'].length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <AlertCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-surface-500">In Progress</p>
                <p className="text-2xl font-bold">{statusGroups['In Progress'].length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Waiting</p>
                <p className="text-2xl font-bold">{statusGroups['Waiting'].length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Done</p>
                <p className="text-2xl font-bold">{statusGroups['Done'].length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={urgentCount > 0 ? 'border-red-500/50' : ''}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Urgent</p>
                <p className="text-2xl font-bold">{urgentCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-800"
          >
            <option value="all">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting">Waiting</option>
            <option value="Done">Done</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : mentorTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-surface-300" />
              <h3 className="mb-2 text-lg font-medium text-surface-900 dark:text-surface-100">
                No mentor tasks yet
              </h3>
              <p className="mb-4 text-center text-surface-500">
                Start adding tasks for mentors to track.<br />
                Choose a category below to add your first task.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Categories Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categoryNames.map((categoryName) => {
            const config = categoryConfig[categoryName];
            const CategoryIcon = config.icon;
            const tasks = groupedByCategory[categoryName];
            const todoCount = tasks.filter(t => t.status === 'To Do').length;
            const inProgressCount = tasks.filter(t => t.status === 'In Progress' || t.status === 'Waiting').length;

            return (
              <Card
                key={categoryName}
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary-500/50"
                onClick={() => setSelectedCategory(categoryName)}
              >
                <CardContent className="p-0">
                  {/* Category Header */}
                  <div className={cn('flex items-center gap-3 p-4 bg-gradient-to-br', config.color)}>
                    <CategoryIcon className="h-8 w-8 text-white" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{categoryName}</h3>
                      <p className="text-xs text-white/80">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Category Stats */}
                  <div className="p-4">
                    <p className="mb-3 text-xs text-surface-500">{config.description}</p>

                    {/* Status breakdown */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {todoCount > 0 && (
                        <span className="rounded-full bg-surface-500/10 px-2 py-1 text-surface-600 dark:text-surface-400">
                          {todoCount} to do
                        </span>
                      )}
                      {inProgressCount > 0 && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-600 dark:text-blue-400">
                          {inProgressCount} active
                        </span>
                      )}
                    </div>

                    {/* Add button for admins */}
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCategory(categoryName);
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Task
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Category Detail */}
        {selectedCategory && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const config = categoryConfig[selectedCategory];
                  const CategoryIcon = config?.icon || Users;
                  return (
                    <>
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br', config?.color || 'from-surface-400 to-surface-500')}>
                        <CategoryIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
                          {selectedCategory}
                        </h2>
                        <p className="text-sm text-surface-500">{config?.description}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                Close
              </Button>
            </div>

            {groupedByCategory[selectedCategory]?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="mb-4 text-surface-500">No tasks in this category yet</p>
                  {isAdmin && (
                    <Button onClick={() => handleAddToCategory(selectedCategory)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Task
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupedByCategory[selectedCategory]?.map(renderTaskCard)}
              </div>
            )}
          </div>
        )}

        {/* Uncategorized Tasks */}
        {uncategorized.length > 0 && !selectedCategory && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-surface-100">
              Other Tasks
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {uncategorized.map(renderTaskCard)}
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <AddMentorTaskModal
        open={showAddModal}
        onOpenChange={handleCloseModal}
        task={editingTask}
        defaultCategory={defaultCategory}
      />
    </div>
  );
}

export default MentorTasks;
