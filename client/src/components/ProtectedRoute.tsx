import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { VyaparAILogo } from './VyaparAILogo';

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink">
      <VyaparAILogo size="md" />
      <Loader2 size={22} className="animate-spin text-brand" aria-hidden="true" />
    </div>
  );
}

/** Guards private routes: only signed-in, activated accounts pass. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.accountStatus !== 'active') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default ProtectedRoute;
