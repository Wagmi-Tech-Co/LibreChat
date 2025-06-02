import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SystemRoles } from 'librechat-data-provider';
import DashBreadcrumb from '~/routes/Layouts/DashBreadcrumb';
import { useAuthContext } from '~/hooks';

export default function AdminView() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (user?.role !== SystemRoles.ADMIN) {
      timeoutId = setTimeout(() => {
        navigate('/c/new');
      }, 1000);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [user, navigate]);

  if (user?.role !== SystemRoles.ADMIN) {
    return null;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-surface-primary p-0 lg:p-2">
      <DashBreadcrumb />
      <div className="flex w-full flex-grow overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
