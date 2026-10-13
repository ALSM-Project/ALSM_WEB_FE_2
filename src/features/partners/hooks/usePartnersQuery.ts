import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partnersApi, CreatePartnerRequest, CreatePartnerProjectRequest } from '../api/partners.api';

export const PARTNERS_QUERY_KEY = ['partners'];
export const partnerQueryKey = (id: string) => ['partners', id];
export const partnerProjectsQueryKey = (partnerId: string) => ['partners', partnerId, 'projects'];

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

export const usePartnerQuery = (partnerId: string | undefined) => {
  return useQuery({
    queryKey: partnerQueryKey(partnerId ?? ''),
    queryFn: () => partnersApi.getById(partnerId!),
    enabled: Boolean(partnerId),
  });
};

export const usePartnerProjectsQuery = (partnerId: string | undefined) => {
  return useQuery({
    queryKey: partnerProjectsQueryKey(partnerId ?? ''),
    queryFn: () => partnersApi.listProjects(partnerId!),
    enabled: Boolean(partnerId),
  });
};

export const useCreatePartnerProjectMutation = (partnerId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePartnerProjectRequest) => partnersApi.createProject(partnerId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerProjectsQueryKey(partnerId ?? '') });
    },
  });
};
