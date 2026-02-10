import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestoreClient from '../api/firestoreClient';

const COLLECTION = 'expenses';

export function useExpenses(filters = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => {
      if (Object.keys(filters).length === 0) {
        return firestoreClient.getAll(COLLECTION);
      }
      return firestoreClient.query(COLLECTION, filters);
    },
  });
}

export function useExpense(id) {
  return useQuery({
    queryKey: ['expense', id],
    queryFn: () => firestoreClient.getById(COLLECTION, id),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => firestoreClient.create(COLLECTION, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => firestoreClient.update(COLLECTION, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense', variables.id] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => firestoreClient.remove(COLLECTION, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useExpenseStats() {
  const { data: expenses = [] } = useExpenses();

  const stats = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    byCategory: {},
    byTeam: {},
  };

  // Group by category
  const categories = ['Parts', 'Tools', 'Registration', 'Travel', 'Marketing', 'Other'];
  categories.forEach(cat => {
    const catExpenses = expenses.filter(e => e.category === cat);
    stats.byCategory[cat] = {
      count: catExpenses.length,
      amount: catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    };
  });

  // Group by team
  const teams = ['Build Team', 'Programming Team', 'Outreach Team', 'All Teams'];
  teams.forEach(team => {
    const teamExpenses = expenses.filter(e => e.team === team);
    stats.byTeam[team] = {
      count: teamExpenses.length,
      amount: teamExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    };
  });

  return stats;
}

export default useExpenses;
