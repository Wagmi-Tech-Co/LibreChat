import { Shield } from 'lucide-react';
import { SystemRoles } from 'librechat-data-provider';
import { Button } from '~/components/ui';
import { useLocalize, useCustomLink, useAuthContext } from '~/hooks';

export default function AdminNavigationButton() {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const adminLinkHandler = useCustomLink<HTMLButtonElement>('/d/admin/email-whitelist');

  if (user?.role !== SystemRoles.ADMIN) {
    return null;
  }

  return (
    
    <Button
      size="sm"
      variant="outline"
      className="mr-2 h-10 w-fit gap-1 border transition-all dark:bg-transparent dark:hover:bg-surface-tertiary sm:m-0"
      onClick={adminLinkHandler}
    >
      <Shield className="cursor-pointer" size={16} aria-hidden="true" />
      <span className="hidden sm:flex">{localize('com_admin_email_whitelist_dashboard')}</span>
      <span className="flex sm:hidden">{localize('com_ui_admin')}</span>
    </Button>
  );
}
