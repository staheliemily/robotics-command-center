import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestoreClient from '../api/firestoreClient';

const COLLECTION = 'wishlist';

export function useWishlist(filters = {}) {
  return useQuery({
    queryKey: ['wishlist', filters],
    queryFn: () => {
      if (Object.keys(filters).length === 0) {
        return firestoreClient.getAll(COLLECTION);
      }
      return firestoreClient.query(COLLECTION, filters);
    },
  });
}

export function useWishlistItem(id) {
  return useQuery({
    queryKey: ['wishlist-item', id],
    queryFn: () => firestoreClient.getById(COLLECTION, id),
    enabled: !!id,
  });
}

export function useCreateWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => firestoreClient.create(COLLECTION, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useUpdateWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => firestoreClient.update(COLLECTION, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-item', variables.id] });
    },
  });
}

export function useDeleteWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => firestoreClient.remove(COLLECTION, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export default useWishlist;
