import React from 'react';
import { Users } from 'lucide-react';
import { SystemRoles } from 'librechat-data-provider';
import { TooltipAnchor } from '~/components/ui';
import { useAuthContext } from '~/hooks';
import { useLocalize } from '~/hooks';
import { useNavigate } from 'react-router-dom';
import { cn } from '~/utils';

export function ManageUsers() {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const handleManageUsers = () => {
    navigate('/d/admin/email-whitelist');
  };

  // Only show to admin users
  if (user?.role !== SystemRoles.ADMIN) {
    return null;
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <TooltipAnchor
        description={localize('com_admin_manage_users')}
        render={
          <button
            onClick={handleManageUsers}
            aria-label={localize('com_admin_manage_users')}
            className={cn(
              'inline-flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-border-light text-text-primary transition-all ease-in-out hover:bg-surface-tertiary',
              'bg-transparent shadow-sm hover:bg-surface-hover hover:shadow-md',
              'active:shadow-inner',
            )}
          >
            <Users
              className={cn('relative h-5 w-5 md:h-4 md:w-4')}
            />
          </button>
        }
      />
    </div>
  );
}
