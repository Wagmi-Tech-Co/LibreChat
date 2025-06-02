import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryObserverResult, UseMutationResult } from '@tanstack/react-query';
import type * as t from 'librechat-data-provider';
import { dataService } from 'librechat-data-provider';

// Request email whitelist mutation
export const useRequestEmailWhitelistMutation = (): UseMutationResult<
  t.TRequestEmailWhitelistResponse,
  unknown,
  t.TRequestEmailWhitelistRequest,
  unknown
> => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: t.TRequestEmailWhitelistRequest) => 
      dataService.requestEmailWhitelist(payload),
    onSuccess: () => {
      // Invalidate admin queries if user is admin
      queryClient.invalidateQueries({ queryKey: ['emailWhitelistRequests'] });
    },
  });
};

// Get email whitelist requests query (admin only)
export const useGetEmailWhitelistRequestsQuery = (
  status?: string,
  page?: number,
  limit?: number,
  enabled: boolean = true
): QueryObserverResult<t.TEmailWhitelistRequestsResponse> => {
  return useQuery({
    queryKey: ['emailWhitelistRequests', status, page, limit],
    queryFn: () => dataService.getEmailWhitelistRequests(status, page, limit),
    enabled,
  });
};

// Review email whitelist request mutation (admin only)
export const useReviewEmailWhitelistMutation = (): UseMutationResult<
  t.TReviewEmailWhitelistResponse,
  unknown,
  { requestId: string; payload: t.TReviewEmailWhitelistRequest },
  unknown
> => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, payload }) => 
      dataService.reviewEmailWhitelistRequest(requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailWhitelistRequests'] });
    },
  });
};

// Delete email whitelist request mutation (admin only)
export const useDeleteEmailWhitelistMutation = (): UseMutationResult<
  { success: boolean; message: string },
  unknown,
  string,
  unknown
> => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (requestId: string) => 
      dataService.deleteEmailWhitelistRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailWhitelistRequests'] });
    },
  });
};
