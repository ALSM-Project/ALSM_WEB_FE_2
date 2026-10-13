import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partnersApi, CreatePartnerRequest } from '../api/partners.api';

export const PARTNERS_QUERY_KEY = ['partners'];

export const usePartnersQuery = () => {
  return useQuery({
    queryKey: PARTNERS_QUERY_KEY,
    queryFn: partnersApi.list,
  });
};

export const useCreatePartnerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePartnerRequest) => partnersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERS_QUERY_KEY });
    },
  });
};
