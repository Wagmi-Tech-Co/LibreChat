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
import { useAuthContext } from '~/hooks/AuthContext';

type FormValues = {
  [Permissions.SHARED_GLOBAL]: boolean;
  [Permissions.UPDATE]: boolean;
  selectedUsers: string[];
};

type User = {
  id: string;
  email: string;
  name: string;
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
  const { user } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [userToRemove, setUserToRemove] = useState<string | null>(null);
  const [isRemovingUser, setIsRemovingUser] = useState(false);
  const { data: startupConfig = {} as TStartupConfig, isFetching } = useGetStartupConfig();
  const { data: usersData, isLoading: isLoadingUsers } = useGetAllUsersQuery();
  const { instanceProjectId } = startupConfig;

  const agentIsGlobal = useMemo(
    () => !!projectIds.includes(instanceProjectId),
    [projectIds, instanceProjectId],
  );

  const allUsers = usersData?.data ?? [];

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

  // Filter and sort users: exclude current user, shared users first, then others
  const filteredUsers = useMemo(() => {
    let users = allUsers;

    // Exclude current user from the list
    if (user?.id) {
      users = users.filter((u) => u.id !== user.id);
    }

    // Apply search filter if there's a search term
    if (searchTerm) {
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Sort users: shared users first, then non-shared users
    return users.sort((a, b) => {
      const aIsShared = selectedUsers.includes(a.id);
      const bIsShared = selectedUsers.includes(b.id);

      if (aIsShared && !bIsShared) return -1;
      if (!aIsShared && bIsShared) return 1;
      return 0; // Keep original order for users in the same category
    });
  }, [allUsers, searchTerm, selectedUsers, user?.id]);

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

  // Handle global sharing toggle changes - make them exclusive
  useEffect(() => {
    if (sharedGlobalValue) {
      // When global sharing is turned on, clear individual selections
      setValue('selectedUsers', []);
    }
  }, [sharedGlobalValue, setValue]);

  const updateAgent = useUpdateAgentMutation({
    onSuccess: (data) => {
      // Update local state based on operation type
      if (isRemovingUser && userToRemove) {
        // If we just removed a user, update local state by removing only that user
        const currentUsers = getValues('selectedUsers');
        const updatedUsers = currentUsers.filter((id) => id !== userToRemove);
        setValue('selectedUsers', updatedUsers);
      } else if (data.sharedWithUsers) {
        // For other operations, use the server response
        setValue('selectedUsers', data.sharedWithUsers);
      }

      // Reset state after successful operation
      setUserToRemove(null);
      setIsRemovingUser(false);

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
      // Reset state on error
      setUserToRemove(null);
      setIsRemovingUser(false);
    },
  });

  if (!agent_id || !instanceProjectId) {
    return null;
  }

  const handleUserToggle = (userId: string, checked: boolean) => {
    const currentUsers = getValues('selectedUsers');

    if (checked) {
      // When selecting individual users, turn off global sharing to make them exclusive
      if (getValues(Permissions.SHARED_GLOBAL)) {
        setValue(Permissions.SHARED_GLOBAL, false);
      }

      const newSelectedUsers = [...currentUsers, userId];
      setValue('selectedUsers', newSelectedUsers);
    } else {
      // When unchecking a user, show confirmation dialog
      setUserToRemove(userId);
    }
  };

  const confirmRemoveAccess = () => {
    if (!userToRemove) return;

    // Remove user from local state immediately for better UX
    const currentUsers = getValues('selectedUsers');
    const newSelectedUsers = currentUsers.filter((id) => id !== userToRemove);
    setValue('selectedUsers', newSelectedUsers);

    // Set flag to indicate we're removing a user
    setIsRemovingUser(true);

    // Only send API call to remove this specific user
    const payload = {} as AgentUpdateParams;
    payload.removeSharedUsers = [userToRemove];

    updateAgent.mutate({
      agent_id,
      data: payload,
    });

    // Don't reset userToRemove here - let the success/error handlers do it
  };

  const cancelRemoveAccess = () => {
    setUserToRemove(null);
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
        // Don't automatically set isCollaborative to false when turning off global sharing
        // if there are still individual users selected
        if (data.selectedUsers.length === 0) {
          payload.isCollaborative = false;
        }
      }
    }

    // Handle individual user sharing (only when global sharing is off)
    if (!data[Permissions.SHARED_GLOBAL]) {
      const currentSharedUsers = sharedWithUsers || [];
      const newSelectedUsers = data.selectedUsers || [];

      // Users to add
      const usersToAdd = newSelectedUsers.filter((userId) => !currentSharedUsers.includes(userId));
      // Users to remove
      const usersToRemove = currentSharedUsers.filter(
        (userId) => !newSelectedUsers.includes(userId),
      );

      if (usersToAdd.length > 0) {
        payload.sharedWithUsers = usersToAdd;
      }

      if (usersToRemove.length > 0) {
        payload.removeSharedUsers = usersToRemove;
      }
    } else if (data[Permissions.SHARED_GLOBAL] && sharedWithUsers.length > 0) {
      // When global sharing is enabled, remove all individual user sharing
      payload.removeSharedUsers = sharedWithUsers;
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
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex-1">
              <label
                htmlFor={Permissions.SHARED_GLOBAL}
                className="block cursor-pointer text-sm font-medium text-gray-900"
              >
                {localize('com_ui_share_to_all_users')}
              </label>
              {agentIsGlobal && (
                <p className="mt-1 text-xs text-gray-500">
                  {localize('com_ui_agent_shared_to_all')}
                </p>
              )}
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
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex-1">
              <label
                htmlFor={Permissions.UPDATE}
                className={`block cursor-pointer text-sm font-medium ${
                  isFetching ||
                  updateAgent.isLoading ||
                  !instanceProjectId ||
                  (!sharedGlobalValue && selectedUsers.length === 0)
                    ? 'text-gray-400'
                    : 'text-gray-900'
                }`}
              >
                {localize('com_agents_allow_editing')}
              </label>
              {!sharedGlobalValue && selectedUsers.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {localize('com_ui_editing_for_selected_users')}
                </p>
              )}
            </div>
            <Controller
              name={Permissions.UPDATE}
              control={control}
              disabled={
                isFetching ||
                updateAgent.isLoading ||
                !instanceProjectId ||
                (!sharedGlobalValue && selectedUsers.length === 0)
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
          <div className="border-t border-gray-200 pt-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  {localize('com_ui_share_to_individual_users')}
                </h3>
                {sharedGlobalValue && (
                  <p className="mt-1 text-xs text-gray-500">
                    Bireysel seçim global paylaşım etkinken devre dışıdır
                  </p>
                )}
              </div>
              <div className="text-xs font-medium text-gray-500">
                {localize('com_ui_x_selected', { 0: selectedUsers.length })}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                type="text"
                placeholder={localize('com_ui_search_users')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2.5 pl-10 pr-4 text-sm"
                disabled={sharedGlobalValue}
              />
            </div>

            {/* User List */}
            <div
              className={`max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white ${
                sharedGlobalValue ? 'opacity-50' : ''
              }`}
            >
              {isLoadingUsers ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-sm">{localize('com_ui_loading_users')}</div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-sm">
                    {searchTerm
                      ? localize('com_ui_no_users_found')
                      : localize('com_ui_no_users_available')}
                  </div>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isShared = selectedUsers.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between border-b border-gray-100 p-4 transition-colors last:border-b-0 hover:bg-gray-50 ${
                        isShared ? 'border-blue-200 bg-blue-50' : ''
                      }`}
                    >
                      <div className="mr-3 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {user.email}
                          </div>
                          {isShared && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                              Paylaşılan
                            </span>
                          )}
                        </div>
                        {user.name && user.name !== user.email.split('@')[0] && (
                          <div className="mt-1 truncate text-xs text-gray-500">{user.name}</div>
                        )}
                      </div>
                      <Checkbox
                        checked={isShared}
                        onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
                        disabled={isFetching || updateAgent.isLoading || sharedGlobalValue}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Confirmation Dialog for Remove Access */}
          {userToRemove && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Onay</h3>
                <p className="mb-6 text-sm leading-relaxed text-gray-700">
                  <span className="font-medium">
                    {allUsers.find((u) => u.id === userToRemove)?.email || 'User'}
                  </span>{' '}
                  kullanıcısının erişimini kaldırmak istediğinizden emin misiniz?
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelRemoveAccess}
                    disabled={updateAgent.isLoading}
                    className="px-4 py-2"
                  >
                    {localize('com_ui_cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={confirmRemoveAccess}
                    disabled={updateAgent.isLoading}
                    className="px-4 py-2"
                  >
                    {updateAgent.isLoading
                      ? localize('com_ui_saving')
                      : localize('com_nav_tool_remove')}
                  </Button>
                </div>
              </div>
            </div>
          )}

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
