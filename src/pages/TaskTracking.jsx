import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  ArrowLeft,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ThemeToggle from '../components/dashboard/ThemeToggle';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskCard from '../components/tasks/TaskCard';
import AddTaskModal from '../components/tasks/AddTaskModal';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { useTasks, useTaskStats } from '../hooks/useTasks';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export function TaskTracking() {
  const { data: allTasks = [], isLoading } = useTasks();
  const taskStats = useTaskStats();
  const { isAdmin } = useAuth();

  const [filters, setFilters] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Apply filters
  const filteredTasks = allTasks.filter(task => {
    if (filters.team && task.team !== filters.team) return false;
    if (filters.category && task.category !== filters.category) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.department && task.department !== filters.department) return false;
    return true;
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  // Get risk tasks (blocked or critical)
  const riskTasks = allTasks.filter(
    t => t.status === 'Blocked' || t.priority === 'Critical'
  );

  // Get tasks needing mentor
  const mentorTasks = allTasks.filter(t => t.needs_mentor);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-surface-200 bg-white/80 backdrop-blur-sm dark:border-surface-800 dark:bg-surface-900/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Task Tracking</h1>
                  <p className="text-xs text-surface-500">Monitor & Manage</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button onClick={() => setShowAddModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Status Summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Not Started</p>
                  <p className="text-2xl font-bold">{taskStats.notStarted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">In Progress</p>
                  <p className="text-2xl font-bold">{taskStats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Blocked</p>
                  <p className="text-2xl font-bold">{taskStats.blocked}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Completed</p>
                  <p className="text-2xl font-bold">{taskStats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Critical</p>
                  <p className="text-2xl font-bold">{taskStats.critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Alerts */}
        {(riskTasks.length > 0 || mentorTasks.length > 0) && (
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            {/* Blocked/Critical Tasks */}
            {riskTasks.length > 0 && (
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Risk Tasks ({riskTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {riskTasks.slice(0, 5).map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="flex w-full items-center justify-between rounded-lg bg-red-50 p-3 text-left transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                      >
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-surface-500">{task.team}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={task.status === 'Blocked' ? 'blocked' : 'critical'}>
                            {task.status === 'Blocked' ? 'Blocked' : task.priority}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mentor Needed Tasks */}
            {mentorTasks.length > 0 && (
              <Card className="border-yellow-200 dark:border-yellow-900">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-5 w-5" />
                    Needs Mentor ({mentorTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {mentorTasks.slice(0, 5).map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="flex w-full items-center justify-between rounded-lg bg-yellow-50 p-3 text-left transition-colors hover:bg-yellow-100 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50"
                      >
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-surface-500">{task.team}</p>
                        </div>
                        <Badge variant="warning">Mentor</Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <TaskFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </CardContent>
        </Card>

        {/* Task List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTasks.length === 0 ? (
              <div className="col-span-full py-12 text-center text-surface-500">
                No tasks found matching your filters.
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTask(task)}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddTaskModal open={showAddModal} onOpenChange={setShowAddModal} />
      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </div>
  );
}

export default TaskTracking;
