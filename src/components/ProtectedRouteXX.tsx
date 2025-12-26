// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

export default function ProtectedRoute({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { user, userLoading, permissions } = useUser();

  // עדיין טוען משתמש / תפקידים / הרשאות
  if (userLoading) {
    return <div className="p-6 text-center">Loading…</div>;
  }

  // אם אין משתמש – נשלח להתחברות
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // אם אין הרשאה
  if (!permissions[permission]) {
    return (
      <div className="p-6 text-center text-red-500">
        You don’t have permission to view this page.
      </div>
    );
  }

  return <>{children}</>;
}
