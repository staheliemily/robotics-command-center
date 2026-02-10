import React, { useState } from 'react';
import { Plus, Receipt, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useExpenses, useDeleteExpense } from '../../hooks/useExpenses';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import AddExpenseModal from './AddExpenseModal';

const categoryColors = {
  Parts: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Tools: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Registration: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Travel: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  Marketing: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  Other: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
};

export function ExpenseList({ className }) {
  const { data: expenses = [], isLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete expense:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
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

  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return (
    <div className={cn("p-4 md:p-6", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Expenses ({expenses.length})
        </h3>
        {isAdmin && (
          <Button onClick={() => setShowModal(true)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        )}
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        {sortedExpenses.length === 0 ? (
          <div className="py-12 text-center text-surface-500">
            No expenses recorded. {isAdmin && 'Click "Add Expense" to add one.'}
          </div>
        ) : (
          sortedExpenses.map(expense => (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-surface-100 p-2 dark:bg-surface-800">
                      <Receipt className="h-5 w-5 text-surface-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{expense.description}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-surface-500">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          categoryColors[expense.category]
                        )}>
                          {expense.category}
                        </span>
                        {expense.team && (
                          <span>{expense.team}</span>
                        )}
                        <span>•</span>
                        <span>{formatDate(expense.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-orange-600">
                      -{formatCurrency(expense.amount)}
                    </span>

                    {expense.receipt_url && (
                      <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-surface-500 hover:text-primary-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(expense)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <AddExpenseModal
        open={showModal}
        onOpenChange={handleCloseModal}
        expense={editingExpense}
      />
    </div>
  );
}

export default ExpenseList;
