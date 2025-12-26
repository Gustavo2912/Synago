import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

/* ---------------- TYPES ---------------- */

type UserRoleRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  role: string;
  created_at: string;
  suspended: boolean | null;
};

type UserContextType = {
  user: any | null;
  userLoading: boolean;

  roles: UserRoleRow[];
  isGlobalSuperAdmin: boolean;

  organizationId: string | null; // "all" allowed
  setOrganizationId: (id: string | null) => void;

  primaryRole: string | null;
  permissions: Record<string, boolean>;

  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  userLoading: true,
  roles: [],
  isGlobalSuperAdmin: false,
  organizationId: null,
  setOrganizationId: () => {},
  primaryRole: null,
  permissions: {},
  refreshUser: async () => {},
});

/* ---------------- HELPERS ---------------- */

function mergePermissionsForRoles(
  roleNames: string[]
): Record<string, boolean> {
  const merged: Record<string, boolean> = {};
  roleNames.forEach((role) => {
    const perms = ROLE_PERMISSIONS[role] || [];
    perms.forEach((p) => (merged[p] = true));
  });
  return merged;
}

/* ---------------- PROVIDER ---------------- */

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [isGlobalSuperAdmin, setIsGlobalSuperAdmin] = useState(false);

  const [organizationId, setOrganizationIdState] =
    useState<string | null>(null);

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [primaryRole, setPrimaryRole] = useState<string | null>(null);

  /* ---------------- SET ORGANIZATION ---------------- */

  const setOrganizationId = useCallback((id: string | null) => {
    setOrganizationIdState(id);
    try {
      if (id) localStorage.setItem("activeOrganizationId", id);
      else localStorage.removeItem("activeOrganizationId");
    } catch {}
  }, []);

  /* ---------------- LOAD USER + ROLES ---------------- */

  const refreshUser = useCallback(async () => {
    setUserLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user ?? null;

    setUser(sessionUser);

    if (!sessionUser) {
      setRoles([]);
      setIsGlobalSuperAdmin(false);
      setOrganizationIdState(null);
      setPermissions({});
      setPrimaryRole(null);
      setUserLoading(false);
      return;
    }

    /* Load roles */
    const { data: roleRows, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", sessionUser.id);

    if (error) {
      console.error("Failed loading roles:", error);
      setUserLoading(false);
      return;
    }

    const userRoles = roleRows || [];
    setRoles(userRoles);

    const hasSuper = userRoles.some((r) => r.role === "super_admin");
    setIsGlobalSuperAdmin(hasSuper);

    setPrimaryRole(
      hasSuper ? "super_admin" : userRoles[0]?.role ?? null
    );

    /* Resolve organization */
    if (hasSuper) {
      setOrganizationIdState("all");
      localStorage.setItem("activeOrganizationId", "all");
    } else {
      let resolved: string | null = null;

      const stored = localStorage.getItem("activeOrganizationId");
      if (stored && userRoles.some((r) => r.organization_id === stored)) {
        resolved = stored;
      }

      if (!resolved) {
        resolved =
          userRoles.find((r) => r.organization_id)?.organization_id ?? null;
      }

      setOrganizationIdState(resolved);
      if (resolved) localStorage.setItem("activeOrganizationId", resolved);
    }

    setUserLoading(false);
  }, []);

  /* ---------------- AUTH LISTENER ---------------- */

  useEffect(() => {
    refreshUser();

    const { data } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => data.subscription.unsubscribe();
  }, [refreshUser]);

  /* ---------------- PERMISSIONS (REACTIVE) ---------------- */

  useEffect(() => {
    if (!user || roles.length === 0) {
      setPermissions({});
      return;
    }

    if (isGlobalSuperAdmin) {
      setPermissions(mergePermissionsForRoles(["super_admin"]));
      return;
    }

    const activeRoles = roles.filter(
      (r) => r.organization_id === organizationId && !r.suspended
    );

    setPermissions(
      mergePermissionsForRoles(activeRoles.map((r) => r.role))
    );
  }, [user, roles, organizationId, isGlobalSuperAdmin]);

  return (
    <UserContext.Provider
      value={{
        user,
        userLoading,
        roles,
        isGlobalSuperAdmin,
        organizationId,
        setOrganizationId,
        primaryRole,
        permissions,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
