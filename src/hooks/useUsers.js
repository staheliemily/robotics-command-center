import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestoreClient from '../api/firestoreClient';
import { useAuth } from '../context/AuthContext';

const COLLECTION = 'users';

// The rules only let an admin list accounts attached to their own organization,
// so the query has to ask for exactly that.
export function useUsers({ enabled = true } = {}) {
  const { org } = useAuth();

  return useQuery({
    queryKey: ['users', org?.id],
    queryFn: () => firestoreClient.query(COLLECTION, { org_id: org.id }),
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
