import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

export default function ProtectedRoute({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission?: string;
}) {
  const {
    user,
    userLoading,
    permissions,
    isGlobalSuperAdmin,
  } = useUser();

  const location = useLocation();

  /* ---------------------------------
     LOADING USER
  --------------------------------- */
  if (userLoading) {
    return <div className="p-6">Loading…</div>;
  }

  /* ---------------------------------
     NOT AUTHENTICATED
  --------------------------------- */
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  /* ---------------------------------
     SUPER ADMIN → ALWAYS ALLOWED
  --------------------------------- */
  if (isGlobalSuperAdmin) {
    return <>{children}</>;
  }

  /* ---------------------------------
     PERMISSION CHECK FAILED
     → REDIRECT TO HOME
  --------------------------------- */
  if (permission && !permissions[permission]) {
    return (
      <Navigate
        to="/home"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  /* ---------------------------------
     ALLOWED
  --------------------------------- */
  return <>{children}</>;
}
