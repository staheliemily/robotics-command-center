import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestoreClient from '../api/firestoreClient';

const COLLECTION = 'sponsors';

export function useSponsors(filters = {}) {
  return useQuery({
    queryKey: ['sponsors', filters],
    queryFn: () => {
      if (Object.keys(filters).length === 0) {
        return firestoreClient.getAll(COLLECTION);
      }
      return firestoreClient.query(COLLECTION, filters);
    },
  });
}

export function useSponsor(id) {
  return useQuery({
    queryKey: ['sponsor', id],
    queryFn: () => firestoreClient.getById(COLLECTION, id),
    enabled: !!id,
  });
}

export function useCreateSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => firestoreClient.create(COLLECTION, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
    },
  });
}

export function useUpdateSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => firestoreClient.update(COLLECTION, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      queryClient.invalidateQueries({ queryKey: ['sponsor', variables.id] });
    },
  });
}

export function useDeleteSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => firestoreClient.remove(COLLECTION, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
    },
  });
}

export function useSponsorStats() {
  const { data: sponsors = [] } = useSponsors();

  const stats = {
    total: sponsors.length,
    totalAmount: sponsors.reduce((sum, s) => sum + (s.amount || 0), 0),
    pending: sponsors.filter(s => s.status === 'Pending'),
    confirmed: sponsors.filter(s => s.status === 'Confirmed'),
    received: sponsors.filter(s => s.status === 'Received'),
    pendingAmount: sponsors
      .filter(s => s.status === 'Pending')
      .reduce((sum, s) => sum + (s.amount || 0), 0),
    confirmedAmount: sponsors
      .filter(s => s.status === 'Confirmed')
      .reduce((sum, s) => sum + (s.amount || 0), 0),
    receivedAmount: sponsors
      .filter(s => s.status === 'Received')
      .reduce((sum, s) => sum + (s.amount || 0), 0),
  };

  return stats;
}

export default useSponsors;
