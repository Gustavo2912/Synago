// src/components/ProtectedRoute.tsx
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string; // כרגע מתעלמים, רק כדי להחזיר את הלוגאין לעבוד
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { userLoading, user } = useUser();

  // בזמן שה-UserProvider טוען את המידע מה-Supabase
  if (userLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <span>Loading...</span>
      </div>
    );
  }

  // אין משתמש – מפנים לעמוד התחברות
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // יש משתמש – נותנים להיכנס, בלי בדיקת permissions
  return <>{children}</>;
}
