import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestoreClient from '../api/firestoreClient';
import { useTeams } from './useTeams';

const COLLECTION = 'tasks';

export function useTasks(filters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => {
      if (Object.keys(filters).length === 0) {
        return firestoreClient.getAll(COLLECTION);
      }
      return firestoreClient.query(COLLECTION, filters);
    },
  });
}

export function useTask(id) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => firestoreClient.getById(COLLECTION, id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => firestoreClient.create(COLLECTION, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => firestoreClient.update(COLLECTION, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => firestoreClient.remove(COLLECTION, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Utility hooks
export function useTasksByTeam(team) {
  return useTasks({ team });
}

export function useTasksByStatus(status) {
  return useTasks({ status });
}

export function useTasksByCategory(category) {
  return useTasks({ category });
}

export function useTaskStats() {
  const { data: tasks = [] } = useTasks();
  const { teamNames } = useTeams();

  const stats = {
    total: tasks.length,
    notStarted: tasks.filter(t => t.status === 'Not Started').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    blocked: tasks.filter(t => t.status === 'Blocked').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    critical: tasks.filter(t => t.priority === 'Critical').length,
    needsMentor: tasks.filter(t => t.needs_mentor).length,
    byTeam: Object.fromEntries(
      teamNames.map(name => [name, tasks.filter(t => t.team === name).length])
    ),
    byCategory: {
      'FTC': tasks.filter(t => t.category === 'FTC').length,
      'FRC': tasks.filter(t => t.category === 'FRC').length,
    },
  };

  return stats;
}

export default useTasks;
