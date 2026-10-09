import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestoreClient from '../api/firestoreClient';
import { useAuth } from '../context/AuthContext';

// Each organization keeps its own list of people, one record per account,
// stored under orgs/{orgId}/members. The record's id is the account's id.
const COLLECTION = 'members';

// The rules only let an admin list their own organization's people
export function useUsers({ enabled = true } = {}) {
  const { org } = useAuth();

  return useQuery({
    queryKey: ['users', org?.id],
    queryFn: () => firestoreClient.getAll(COLLECTION),
    enabled: enabled && !!org?.id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => firestoreClient.update(COLLECTION, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export default useUsers;
