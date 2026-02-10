import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input, Label } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { useExpenses, useExpenseStats } from '../../hooks/useExpenses';
import { useSponsorStats } from '../../hooks/useSponsors';
import { useTotalBudget, useUpdateTotalBudget } from '../../hooks/useSettings';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, calculatePercentage, cn } from '../../lib/utils';

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#eab308', '#a855f7', '#6b7280'];

export function BudgetGrid({ className }) {
  const { isAdmin } = useAuth();
  const { data: totalBudget = 10000 } = useTotalBudget();
  const { updateBudget, isPending } = useUpdateTotalBudget();
  const expenseStats = useExpenseStats();
  const sponsorStats = useSponsorStats();
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudget, setNewBudget] = useState(totalBudget.toString());

  const spent = expenseStats.totalAmount;
  const income = sponsorStats.receivedAmount;
  const remaining = totalBudget - spent;
  const percentSpent = calculatePercentage(spent, totalBudget);

  // Prepare chart data
  const categoryData = Object.entries(expenseStats.byCategory)
    .filter(([_, data]) => data.amount > 0)
    .map(([category, data]) => ({
      name: category,
      value: data.amount,
    }));

  const teamData = Object.entries(expenseStats.byTeam)
    .filter(([_, data]) => data.amount > 0)
    .map(([team, data]) => ({
      name: team.replace(' Team', ''),
      amount: data.amount,
    }));

  const handleUpdateBudget = () => {
    updateBudget(parseFloat(newBudget) || 10000);
    setShowBudgetModal(false);
  };

  return (
    <div className={cn("p-4 md:p-6 space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Budget */}
        <Card className="relative">
          <CardContent className="p-4">
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8"
                onClick={() => {
                  setNewBudget(totalBudget.toString());
                  setShowBudgetModal(true);
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900">
                <DollarSign className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Total Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Income */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Income (Received)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(income)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spent */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900">
                <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Total Spent</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(spent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remaining */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded-lg p-2",
                remaining >= 0 ? "bg-blue-100 dark:bg-blue-900" : "bg-red-100 dark:bg-red-900"
              )}>
                {remaining >= 0 ? (
                  <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-surface-500">Remaining</p>
                <p className={cn(
                  "text-2xl font-bold",
                  remaining >= 0 ? "text-blue-600" : "text-red-600"
                )}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Budget Usage</span>
            <span className={cn(
              "text-sm font-medium",
              percentSpent > 90 ? "text-red-600" : percentSpent > 70 ? "text-yellow-600" : "text-green-600"
            )}>
              {percentSpent}%
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
            <div
              className={cn(
                "h-full transition-all duration-500",
                percentSpent > 90 ? "bg-red-500" : percentSpent > 70 ? "bg-yellow-500" : "bg-green-500"
              )}
              style={{ width: `${Math.min(percentSpent, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-surface-500">
            <span>{formatCurrency(spent)} spent</span>
            <span>{formatCurrency(remaining)} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expenses by Category</CardTitle>
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
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-surface-500">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Team */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expenses by Team</CardTitle>
          </CardHeader>
          <CardContent>
            {teamData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-surface-500">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Edit Modal */}
      <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Total Budget</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Total Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                min="0"
                step="100"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBudgetModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBudget} disabled={isPending}>
              {isPending ? 'Saving...' : 'Update Budget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BudgetGrid;
