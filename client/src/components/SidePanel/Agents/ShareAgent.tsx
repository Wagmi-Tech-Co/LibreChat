import React, { useEffect, useMemo, useState } from 'react';
import { Share2Icon, X, Search } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { Permissions } from 'librechat-data-provider';
import type { TStartupConfig, AgentUpdateParams } from 'librechat-data-provider';
import {
  Button,
  Switch,
  OGDialog,
  OGDialogTitle,
  OGDialogClose,
  OGDialogContent,
  OGDialogTrigger,
  Input,
  Checkbox,
} from '~/components/ui';
import { useUpdateAgentMutation, useGetStartupConfig, useGetAllUsersQuery } from '~/data-provider';
import { cn, removeFocusOutlines } from '~/utils';
import { useToastContext } from '~/Providers';
import { useLocalize } from '~/hooks';

type FormValues = {
  [Permissions.SHARED_GLOBAL]: boolean;
  [Permissions.UPDATE]: boolean;
  selectedUsers: string[];
};

export default function ShareAgent({
  agent_id = '',
  agentName,
  projectIds = [],
  isCollaborative = false,
  sharedWithUsers = [],
}: {
  agent_id?: string;
  agentName?: string;
  projectIds?: string[];
  isCollaborative?: boolean;
  sharedWithUsers?: string[];
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: startupConfig = {} as TStartupConfig, isFetching } = useGetStartupConfig();
  const { data: usersData, isLoading: isLoadingUsers } = useGetAllUsersQuery();
  const { instanceProjectId } = startupConfig;

  const agentIsGlobal = useMemo(
    () => !!projectIds.includes(instanceProjectId),
    [projectIds, instanceProjectId],
  );

  const allUsers = usersData?.data ?? [];

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return allUsers;
    return allUsers.filter(
      (user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [allUsers, searchTerm]);

  const {
    watch,
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      [Permissions.SHARED_GLOBAL]: agentIsGlobal,
      [Permissions.UPDATE]: isCollaborative,
      selectedUsers: sharedWithUsers || [],
    },
  });

  const sharedGlobalValue = watch(Permissions.SHARED_GLOBAL);
  const selectedUsers = watch('selectedUsers');

  useEffect(() => {
    if (!sharedGlobalValue && selectedUsers.length === 0) {
      setValue(Permissions.UPDATE, false);
    }
  }, [sharedGlobalValue, selectedUsers.length, setValue]);

  useEffect(() => {
    setValue(Permissions.SHARED_GLOBAL, agentIsGlobal);
    setValue(Permissions.UPDATE, isCollaborative);
    setValue('selectedUsers', sharedWithUsers || []);
  }, [agentIsGlobal, isCollaborative, sharedWithUsers, setValue]);

  const updateAgent = useUpdateAgentMutation({
    onSuccess: (data) => {
      showToast({
        message: `${localize('com_assistants_update_success')} ${
          data.name ?? localize('com_ui_agent')
        }`,
        status: 'success',
      });
    },
    onError: (err) => {
      const error = err as Error;
      showToast({
        message: `${localize('com_agents_update_error')}${
          error.message ? ` ${localize('com_ui_error')}: ${error.message}` : ''
        }`,
        status: 'error',
      });
    },
  });

  if (!agent_id || !instanceProjectId) {
    return null;
  }

  const handleUserToggle = (userId: string, checked: boolean) => {
    const currentUsers = getValues('selectedUsers');
    if (checked) {
      setValue('selectedUsers', [...currentUsers, userId]);
    } else {
      setValue(
        'selectedUsers',
        currentUsers.filter((id) => id !== userId),
      );
    }
  };

  const handleSelectAllToggle = () => {
    const areAllUsersSelected = allUsers.length > 0 && selectedUsers.length === allUsers.length;
    if (areAllUsersSelected) {
      setValue('selectedUsers', []);
    } else {
      setValue(
        'selectedUsers',
        allUsers.map((user) => user.id),
      );
    }
  };

  const onSubmit = (data: FormValues) => {
    if (!agent_id || !instanceProjectId) {
      return;
    }

    const payload = {} as AgentUpdateParams;

    // Handle collaborative setting
    if (data[Permissions.UPDATE] !== isCollaborative) {
      payload.isCollaborative = data[Permissions.UPDATE];
    }

    // Handle global sharing
    if (data[Permissions.SHARED_GLOBAL] !== agentIsGlobal) {
      if (data[Permissions.SHARED_GLOBAL]) {
        payload.projectIds = [startupConfig.instanceProjectId];
      } else {
        payload.removeProjectIds = [startupConfig.instanceProjectId];
        payload.isCollaborative = false;
      }
    }

    // Handle individual user sharing
    const currentSharedUsers = sharedWithUsers || [];
    const newSelectedUsers = data.selectedUsers || [];

    // Users to add
    const usersToAdd = newSelectedUsers.filter((userId) => !currentSharedUsers.includes(userId));
    // Users to remove
    const usersToRemove = currentSharedUsers.filter((userId) => !newSelectedUsers.includes(userId));

    if (usersToAdd.length > 0) {
      payload.sharedWithUsers = usersToAdd;
    }

    if (usersToRemove.length > 0) {
      payload.removeSharedUsers = usersToRemove;
    }

    if (Object.keys(payload).length > 0) {
      updateAgent.mutate({
        agent_id,
        data: payload,
      });
    } else {
      showToast({
        message: localize('com_ui_no_changes'),
        status: 'info',
      });
    }
  };

  return (
    <OGDialog>
      <OGDialogTrigger asChild>
        <button
          className={cn(
            'btn btn-neutral border-token-border-light relative h-9 rounded-lg font-medium',
            removeFocusOutlines,
          )}
          aria-label={localize('com_ui_share_var', {
            0: agentName != null && agentName !== '' ? `"${agentName}"` : localize('com_ui_agent'),
          })}
          type="button"
        >
          <div className="flex items-center justify-center gap-2 text-blue-500">
            <Share2Icon className="icon-md h-4 w-4" />
          </div>
        </button>
      </OGDialogTrigger>
      <OGDialogContent className="max-h-[80vh] w-11/12 overflow-y-auto md:max-w-2xl">
        <OGDialogTitle>
          {localize('com_ui_share_var', {
            0: agentName != null && agentName !== '' ? `"${agentName}"` : localize('com_ui_agent'),
          })}
        </OGDialogTitle>
        <form
          className="p-2"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit(onSubmit)(e);
          }}
        >
          {/* Global Sharing Toggle */}
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-200 py-2">
            <div className="flex items-center">
              <button
                type="button"
                className="mr-2 cursor-pointer"
                disabled={isFetching || updateAgent.isLoading || !instanceProjectId}
                onClick={() =>
                  setValue(Permissions.SHARED_GLOBAL, !getValues(Permissions.SHARED_GLOBAL), {
                    shouldDirty: true,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setValue(Permissions.SHARED_GLOBAL, !getValues(Permissions.SHARED_GLOBAL), {
                      shouldDirty: true,
                    });
                  }
                }}
                aria-checked={getValues(Permissions.SHARED_GLOBAL)}
                role="checkbox"
              >
                {localize('com_ui_share_to_all_users')}
              </button>
              <label htmlFor={Permissions.SHARED_GLOBAL} className="select-none">
                {agentIsGlobal && (
                  <span className="ml-2 text-xs">{localize('com_ui_agent_shared_to_all')}</span>
                )}
              </label>
            </div>
            <Controller
              name={Permissions.SHARED_GLOBAL}
              control={control}
              disabled={isFetching || updateAgent.isLoading || !instanceProjectId}
              render={({ field }) => (
                <Switch
                  {...field}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  value={field.value.toString()}
                />
              )}
            />
          </div>

          {/* Allow Editing Toggle */}
          <div className="mb-4 flex items-center justify-between gap-2 py-2">
            <div className="flex items-center">
              <button
                type="button"
                className="mr-2 cursor-pointer"
                disabled={
                  isFetching || updateAgent.isLoading || !instanceProjectId || (!sharedGlobalValue && selectedUsers.length === 0)
                }
                onClick={() =>
                  setValue(Permissions.UPDATE, !getValues(Permissions.UPDATE), {
                    shouldDirty: true,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setValue(Permissions.UPDATE, !getValues(Permissions.UPDATE), {
                      shouldDirty: true,
                    });
                  }
                }}
                aria-checked={getValues(Permissions.UPDATE)}
                role="checkbox"
              >
                {localize('com_agents_allow_editing')}
              </button>
              {!sharedGlobalValue && selectedUsers.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  {localize('com_ui_editing_for_selected_users')}
                </span>
              )}
            </div>
            <Controller
              name={Permissions.UPDATE}
              control={control}
              disabled={
                isFetching || updateAgent.isLoading || !instanceProjectId || (!sharedGlobalValue && selectedUsers.length === 0)
              }
              render={({ field }) => (
                <Switch
                  {...field}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  value={field.value.toString()}
                />
              )}
            />
          </div>

          {/* Individual User Selection */}
          <div className="border-t border-gray-200 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {localize('com_ui_share_to_individual_users')}
              </h3>
              <div className="text-xs text-gray-500">
                {localize('com_ui_x_selected', { 0: selectedUsers.length })}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                type="text"
                placeholder={localize('com_ui_search_users')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 pl-10 pr-4"
              />
            </div>

            {/* Select All Toggle Button */}
            <div className="mb-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllToggle}
                disabled={isLoadingUsers || allUsers.length === 0}
              >
                {allUsers.length > 0 && selectedUsers.length === allUsers.length
                  ? localize('com_ui_deselect_all')
                  : localize('com_ui_select_all')}
              </Button>
            </div>

            {/* User List */}
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
              {isLoadingUsers ? (
                <div className="p-4 text-center text-gray-500">
                  {localize('com_ui_loading_users')}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm
                    ? localize('com_ui_no_users_found')
                    : localize('com_ui_no_users_available')}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between border-b border-gray-100 p-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{user.email}</div>
                      {user.name && user.name !== user.email.split('@')[0] && (
                        <div className="truncate text-xs text-gray-500">{user.name}</div>
                      )}
                    </div>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
                      disabled={isFetching || updateAgent.isLoading}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
            <Button
              type="submit"
              disabled={isFetching || updateAgent.isLoading || isLoadingUsers}
              className="min-w-24"
            >
              {updateAgent.isLoading ? localize('com_ui_saving') : localize('com_ui_save')}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
