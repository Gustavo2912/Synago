// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

export default function ProtectedRoute({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission?: string;
}) {
  const { user, userLoading, permissions, isGlobalSuperAdmin } = useUser();

  // עדיין טוען מידע על המשתמש
  if (userLoading) {
    return <div className="p-6">Loading...</div>;
  }

  // לא מחובר → שולח למסך התחברות
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // super_admin → תמיד מותר
  if (isGlobalSuperAdmin) {
    return <>{children}</>;
  }

  // אם יש בדיקת הרשאה אבל המשתמש חסר אותה
  if (permission && !permissions[permission]) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-3 text-red-500">
          Access Denied
        </h2>
        <p className="text-gray-500">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  // הכל תקין → מציג children
  return <>{children}</>;
}
