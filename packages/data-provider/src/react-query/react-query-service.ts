import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationResult,
  QueryObserverResult,
} from '@tanstack/react-query';
import { Constants, initialModelsConfig } from '../config';
import { defaultOrderQuery } from '../types/assistants';
import * as dataService from '../data-service';
import * as m from '../types/mutations';
import { QueryKeys } from '../keys';
import * as s from '../schemas';
import * as t from '../types';

export const useAbortRequestWithMessage = (): UseMutationResult<
  void,
  Error,
  { endpoint: string; abortKey: string; message: string }
> => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ endpoint, abortKey, message }) =>
      dataService.abortRequestWithMessage(endpoint, abortKey, message),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.balance]);
      },
    },
  );
};

export const useGetSharedMessages = (
  shareId: string,
  config?: UseQueryOptions<t.TSharedMessagesResponse>,
): QueryObserverResult<t.TSharedMessagesResponse> => {
  return useQuery<t.TSharedMessagesResponse>(
    [QueryKeys.sharedMessages, shareId],
    () => dataService.getSharedMessages(shareId),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const useGetSharedLinkQuery = (
  conversationId: string,
  config?: UseQueryOptions<t.TSharedLinkGetResponse>,
): QueryObserverResult<t.TSharedLinkGetResponse> => {
  const queryClient = useQueryClient();
  return useQuery<t.TSharedLinkGetResponse>(
    [QueryKeys.sharedLinks, conversationId],
    () => dataService.getSharedLink(conversationId),
    {
      enabled:
        !!conversationId &&
        conversationId !== Constants.NEW_CONVO &&
        conversationId !== Constants.PENDING_CONVO,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: (data) => {
        queryClient.setQueryData([QueryKeys.sharedLinks, conversationId], {
          conversationId: data.conversationId,
          shareId: data.shareId,
        });
      },
      ...config,
    },
  );
};

export const useGetConversationByIdQuery = (
  id: string,
  config?: UseQueryOptions<s.TConversation>,
): QueryObserverResult<s.TConversation> => {
  return useQuery<s.TConversation>(
    [QueryKeys.conversation, id],
    () => dataService.getConversationById(id),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

//This isn't ideal because its just a query and we're using mutation, but it was the only way
//to make it work with how the Chat component is structured
export const useGetConversationByIdMutation = (id: string): UseMutationResult<s.TConversation> => {
  const queryClient = useQueryClient();
  return useMutation(() => dataService.getConversationById(id), {
    // onSuccess: (res: s.TConversation) => {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.conversation, id]);
    },
  });
};

export const useUpdateMessageMutation = (
  id: string,
): UseMutationResult<unknown, unknown, t.TUpdateMessageRequest, unknown> => {
  const queryClient = useQueryClient();
  return useMutation((payload: t.TUpdateMessageRequest) => dataService.updateMessage(payload), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.messages, id]);
    },
  });
};

export const useUpdateMessageContentMutation = (
  conversationId: string,
): UseMutationResult<unknown, unknown, t.TUpdateMessageContent, unknown> => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: t.TUpdateMessageContent) => dataService.updateMessageContent(payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.messages, conversationId]);
      },
    },
  );
};

export const useUpdateUserKeysMutation = (): UseMutationResult<
  t.TUser,
  unknown,
  t.TUpdateUserKeyRequest,
  unknown
> => {
  const queryClient = useQueryClient();
  return useMutation((payload: t.TUpdateUserKeyRequest) => dataService.updateUserKey(payload), {
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries([QueryKeys.name, variables.name]);
    },
  });
};

export const useClearConversationsMutation = (): UseMutationResult<unknown> => {
  const queryClient = useQueryClient();
  return useMutation(() => dataService.clearAllConversations(), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.allConversations]);
    },
  });
};

export const useRevokeUserKeyMutation = (name: string): UseMutationResult<unknown> => {
  const queryClient = useQueryClient();
  return useMutation(() => dataService.revokeUserKey(name), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.name, name]);
      if (s.isAssistantsEndpoint(name)) {
        queryClient.invalidateQueries([QueryKeys.assistants, name, defaultOrderQuery]);
        queryClient.invalidateQueries([QueryKeys.assistantDocs]);
        queryClient.invalidateQueries([QueryKeys.assistants]);
        queryClient.invalidateQueries([QueryKeys.assistant]);
        queryClient.invalidateQueries([QueryKeys.actions]);
        queryClient.invalidateQueries([QueryKeys.tools]);
      }
    },
  });
};

export const useRevokeAllUserKeysMutation = (): UseMutationResult<unknown> => {
  const queryClient = useQueryClient();
  return useMutation(() => dataService.revokeAllUserKeys(), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.name]);
      queryClient.invalidateQueries([
        QueryKeys.assistants,
        s.EModelEndpoint.assistants,
        defaultOrderQuery,
      ]);
      queryClient.invalidateQueries([
        QueryKeys.assistants,
        s.EModelEndpoint.azureAssistants,
        defaultOrderQuery,
      ]);
      queryClient.invalidateQueries([QueryKeys.assistantDocs]);
      queryClient.invalidateQueries([QueryKeys.assistants]);
      queryClient.invalidateQueries([QueryKeys.assistant]);
      queryClient.invalidateQueries([QueryKeys.actions]);
      queryClient.invalidateQueries([QueryKeys.tools]);
    },
  });
};

export const useGetModelsQuery = (
  config?: UseQueryOptions<t.TModelsConfig>,
): QueryObserverResult<t.TModelsConfig> => {
  return useQuery<t.TModelsConfig>([QueryKeys.models], () => dataService.getModels(), {
    initialData: initialModelsConfig,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: Infinity,
    ...config,
  });
};

export const useCreatePresetMutation = (): UseMutationResult<
  s.TPreset,
  unknown,
  s.TPreset,
  unknown
> => {
  const queryClient = useQueryClient();
  return useMutation((payload: s.TPreset) => dataService.createPreset(payload), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.presets]);
    },
  });
};

export const useDeletePresetMutation = (): UseMutationResult<
  m.PresetDeleteResponse,
  unknown,
  s.TPreset | undefined,
  unknown
> => {
  const queryClient = useQueryClient();
  return useMutation((payload: s.TPreset | undefined) => dataService.deletePreset(payload), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.presets]);
    },
  });
};

export const useUpdateTokenCountMutation = (): UseMutationResult<
  t.TUpdateTokenCountResponse,
  unknown,
  { text: string },
  unknown
> => {
  const queryClient = useQueryClient();
  return useMutation(({ text }: { text: string }) => dataService.updateTokenCount(text), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.tokenCount]);
    },
  });
};

export const useRegisterUserMutation = (
  options?: m.RegistrationOptions,
): UseMutationResult<t.TError, unknown, t.TRegisterUser, unknown> => {
  const queryClient = useQueryClient();
  return useMutation<t.TRegisterUserResponse, t.TError, t.TRegisterUser>(
    (payload: t.TRegisterUser) => dataService.register(payload),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.user]);
        if (options?.onSuccess) {
          options.onSuccess(...args);
        }
      },
    },
  );
};

export const useUserKeyQuery = (
  name: string,
  config?: UseQueryOptions<t.TCheckUserKeyResponse>,
): QueryObserverResult<t.TCheckUserKeyResponse> => {
  return useQuery<t.TCheckUserKeyResponse>(
    [QueryKeys.name, name],
    () => {
      if (!name) {
        return Promise.resolve({ expiresAt: '' });
      }
      return dataService.userKeyQuery(name);
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: false,
      ...config,
    },
  );
};

export const useRequestPasswordResetMutation = (): UseMutationResult<
  t.TRequestPasswordResetResponse,
  unknown,
  t.TRequestPasswordReset,
  unknown
> => {
  return useMutation((payload: t.TRequestPasswordReset) =>
    dataService.requestPasswordReset(payload),
  );
};

export const useResetPasswordMutation = (): UseMutationResult<
  unknown,
  unknown,
  t.TResetPassword,
  unknown
> => {
  return useMutation((payload: t.TResetPassword) => dataService.resetPassword(payload));
};

export const useAvailablePluginsQuery = <TData = s.TPlugin[]>(
  config?: UseQueryOptions<s.TPlugin[], unknown, TData>,
): QueryObserverResult<TData> => {
  return useQuery<s.TPlugin[], unknown, TData>(
    [QueryKeys.availablePlugins],
    () => dataService.getAvailablePlugins(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const useUpdateUserPluginsMutation = (
  _options?: m.UpdatePluginAuthOptions,
): UseMutationResult<t.TUser, unknown, t.TUpdateUserPlugins, unknown> => {
  const queryClient = useQueryClient();
  const { onSuccess, ...options } = _options ?? {};
  return useMutation((payload: t.TUpdateUserPlugins) => dataService.updateUserPlugins(payload), {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries([QueryKeys.user]);
      onSuccess?.(...args);
    },
  });
};

export const useGetCustomConfigSpeechQuery = (
  config?: UseQueryOptions<t.TCustomConfigSpeechResponse>,
): QueryObserverResult<t.TCustomConfigSpeechResponse> => {
  return useQuery<t.TCustomConfigSpeechResponse>(
    [QueryKeys.customConfigSpeech],
    () => dataService.getCustomConfigSpeech(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
    },
  );
};

export const validateInviteToken = (token: string): Promise<{ email: string }> => {
  return dataService.validateInviteToken(token);
};
