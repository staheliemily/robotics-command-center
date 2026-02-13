import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestoreClient from '../api/firestoreClient';

const COLLECTION = 'milestones';

export function useMilestones(filters = {}) {
  return useQuery({
    queryKey: ['milestones', filters],
    queryFn: () => {
      if (Object.keys(filters).length === 0) {
        return firestoreClient.getAll(COLLECTION);
      }
      return firestoreClient.query(COLLECTION, filters);
    },
  });
}

export function useMilestone(id) {
  return useQuery({
    queryKey: ['milestone', id],
    queryFn: () => firestoreClient.getById(COLLECTION, id),
    enabled: !!id,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => firestoreClient.create(COLLECTION, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => firestoreClient.update(COLLECTION, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['milestone', variables.id] });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => firestoreClient.remove(COLLECTION, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

export function useMilestonesByCategory(category) {
  return useMilestones({ category });
}

export default useMilestones;
