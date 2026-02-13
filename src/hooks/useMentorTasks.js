import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestoreClient from '../api/firestoreClient';

const COLLECTION = 'mentor_tasks';

export function useMentorTasks(filters = {}) {
  return useQuery({
    queryKey: ['mentor_tasks', filters],
    queryFn: () => {
      if (Object.keys(filters).length === 0) {
        return firestoreClient.getAll(COLLECTION);
      }
      return firestoreClient.query(COLLECTION, filters);
    },
  });
}

export function useMentorTask(id) {
  return useQuery({
    queryKey: ['mentor_task', id],
    queryFn: () => firestoreClient.getById(COLLECTION, id),
    enabled: !!id,
  });
}

export function useCreateMentorTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => firestoreClient.create(COLLECTION, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor_tasks'] });
    },
  });
}

export function useUpdateMentorTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => firestoreClient.update(COLLECTION, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mentor_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['mentor_task', variables.id] });
    },
  });
}

export function useDeleteMentorTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => firestoreClient.remove(COLLECTION, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor_tasks'] });
    },
  });
}

export default useMentorTasks;
