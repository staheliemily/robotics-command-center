import React from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  Bot,
  LayoutDashboard,
  ListTodo,
  BarChart3,
  ArrowLeft,
  TrendingUp,
  Users,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import ThemeToggle from '../components/dashboard/ThemeToggle';
import { useTaskStats, useTasks } from '../hooks/useTasks';
import { useExpenseStats } from '../hooks/useExpenses';
import { useSponsorStats } from '../hooks/useSponsors';
import { formatCurrency, cn } from '../lib/utils';

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#eab308', '#a855f7', '#ef4444'];

export function Reports() {
  const taskStats = useTaskStats();
  const { data: tasks = [] } = useTasks();
  const expenseStats = useExpenseStats();
  const sponsorStats = useSponsorStats();

  // Prepare task status data
  const taskStatusData = [
    { name: 'Not Started', value: taskStats.notStarted, color: '#eab308' },
    { name: 'In Progress', value: taskStats.inProgress, color: '#3b82f6' },
    { name: 'Blocked', value: taskStats.blocked, color: '#ef4444' },
    { name: 'Completed', value: taskStats.completed, color: '#22c55e' },
  ].filter(d => d.value > 0);

  // Prepare task priority data
  const taskPriorityData = [
    { name: 'Low', count: tasks.filter(t => t.priority === 'Low').length },
    { name: 'Medium', count: tasks.filter(t => t.priority === 'Medium').length },
    { name: 'High', count: tasks.filter(t => t.priority === 'High').length },
    { name: 'Critical', count: tasks.filter(t => t.priority === 'Critical').length },
  ];

  // Prepare team comparison data
  const teamComparisonData = [
    {
      name: 'Build',
      total: taskStats.byTeam['Build Team'] || 0,
      completed: tasks.filter(t => t.team === 'Build Team' && t.status === 'Completed').length,
    },
    {
      name: 'Programming',
      total: taskStats.byTeam['Programming Team'] || 0,
      completed: tasks.filter(t => t.team === 'Programming Team' && t.status === 'Completed').length,
    },
    {
      name: 'Outreach',
      total: taskStats.byTeam['Outreach Team'] || 0,
      completed: tasks.filter(t => t.team === 'Outreach Team' && t.status === 'Completed').length,
    },
  ];

  // Prepare category data
  const categoryData = [
    { name: 'FTC', value: taskStats.byCategory['FTC'] || 0 },
    { name: 'FRC', value: taskStats.byCategory['FRC'] || 0 },
  ].filter(d => d.value > 0);

  // Finance summary
  const financeSummary = {
    totalIncome: sponsorStats.receivedAmount,
    totalExpenses: expenseStats.totalAmount,
    netBalance: sponsorStats.receivedAmount - expenseStats.totalAmount,
    pendingSponsors: sponsorStats.pendingAmount,
  };

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
                  <h1 className="text-lg font-bold">Reports</h1>
                  <p className="text-xs text-surface-500">Analytics & Insights</p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900">
                  <ListTodo className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Total Tasks</p>
                  <p className="text-2xl font-bold">{taskStats.total}</p>
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
                  <p className="text-sm text-surface-500">Completion Rate</p>
                  <p className="text-2xl font-bold">
                    {taskStats.total > 0
                      ? Math.round((taskStats.completed / taskStats.total) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Needs Mentor</p>
                  <p className="text-2xl font-bold">{taskStats.needsMentor}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-lg p-2",
                  financeSummary.netBalance >= 0
                    ? "bg-green-100 dark:bg-green-900"
                    : "bg-red-100 dark:bg-red-900"
                )}>
                  <TrendingUp className={cn(
                    "h-5 w-5",
                    financeSummary.netBalance >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Net Balance</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    financeSummary.netBalance >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(financeSummary.netBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Task Status Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Task Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {taskStatusData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-surface-500">
                  No task data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Priority Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasks by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskPriorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Team Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">FTC vs FRC Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#f57c00" />
                        <Cell fill="#c62828" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-surface-500">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-surface-100 p-4 dark:bg-surface-800">
                <p className="text-sm text-surface-500">Total Income</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(financeSummary.totalIncome)}
                </p>
              </div>
              <div className="rounded-lg bg-surface-100 p-4 dark:bg-surface-800">
                <p className="text-sm text-surface-500">Total Expenses</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(financeSummary.totalExpenses)}
                </p>
              </div>
              <div className="rounded-lg bg-surface-100 p-4 dark:bg-surface-800">
                <p className="text-sm text-surface-500">Net Balance</p>
                <p className={cn(
                  "text-xl font-bold",
                  financeSummary.netBalance >= 0 ? "text-blue-600" : "text-red-600"
                )}>
                  {formatCurrency(financeSummary.netBalance)}
                </p>
              </div>
              <div className="rounded-lg bg-surface-100 p-4 dark:bg-surface-800">
                <p className="text-sm text-surface-500">Pending Sponsors</p>
                <p className="text-xl font-bold text-yellow-600">
                  {formatCurrency(financeSummary.pendingSponsors)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default Reports;
