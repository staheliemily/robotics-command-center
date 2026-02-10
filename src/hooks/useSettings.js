import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestoreClient from '../api/firestoreClient';

export function useSetting(key, defaultValue = null) {
  return useQuery({
    queryKey: ['setting', key],
    queryFn: () => firestoreClient.getSetting(key, defaultValue),
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }) => firestoreClient.setSetting(key, value),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['setting', variables.key] });
    },
  });
}

// Specific setting hooks
export function useTotalBudget() {
  return useSetting('total_budget', 10000);
}

export function useBannerMessage() {
  return useSetting('banner_message', '');
}

export function useUpdateBannerMessage() {
  const mutation = useUpdateSetting();

  return {
    ...mutation,
    updateBanner: (message) => mutation.mutate({ key: 'banner_message', value: message }),
  };
}

export function useUpdateTotalBudget() {
  const mutation = useUpdateSetting();

  return {
    ...mutation,
    updateBudget: (amount) => mutation.mutate({ key: 'total_budget', value: amount }),
  };
}

export default useSetting;
