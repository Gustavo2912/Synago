// src/contexts/UserContext.tsx

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

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

/* ----------------------------------------------------------
   MERGE ROLE PERMISSIONS
---------------------------------------------------------- */
function mergePermissionsForRoles(roleNames: string[]): Record<string, boolean> {
  const merged: Record<string, boolean> = {};

  for (const role of roleNames) {
    const perms = ROLE_PERMISSIONS[role] || [];
    perms.forEach((p) => (merged[p] = true));
  }

  return merged;
}

/* ----------------------------------------------------------
   PROVIDER
---------------------------------------------------------- */
export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [isGlobalSuperAdmin, setIsGlobalSuperAdmin] = useState(false);

  const [organizationIdState, setOrganizationIdState] = useState<string | null>(
    null
  );
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [primaryRole, setPrimaryRole] = useState<string | null>(null);

  /* ----------------------------------------------------------
     SET ORGANIZATION ID
---------------------------------------------------------- */
  const setOrganizationId = useCallback((id: string | null) => {
    console.log("⬅ setOrganizationId CALLED WITH:", id);

    setOrganizationIdState(id);

    try {
      if (id) {
        localStorage.setItem("activeOrganizationId", id);
      } else {
        localStorage.removeItem("activeOrganizationId");
      }
    } catch (err) {
      console.error("LocalStorage set error:", err);
    }
  }, []);

  /* ----------------------------------------------------------
     LOAD USER + ROLES
---------------------------------------------------------- */
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
      try {
        localStorage.removeItem("activeOrganizationId");
      } catch {}
      setUserLoading(false);
      return;
    }

    /* Load user roles */
    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", sessionUser.id);

    if (roleErr) {
      console.error("Failed loading roles:", roleErr);
      setUserLoading(false);
      return;
    }

    const userRoles = roleRows || [];
    setRoles(userRoles);

    /* Determine if SUPER ADMIN */
    const hasSuper = userRoles.some((r) => r.role === "super_admin");
    setIsGlobalSuperAdmin(hasSuper);

    /* PRIMARY ROLE */
    const primary =
      (hasSuper && "super_admin") ||
      (userRoles.length > 0 ? userRoles[0].role : null);

    setPrimaryRole(primary);

    /* ----------------------------------------------------------
       DETERMINE ORGANIZATION ID
       SUPER ADMIN → ALWAYS GLOBAL ("all")
---------------------------------------------------------- */
    if (hasSuper) {
      console.log("🌍 SUPER ADMIN → Setting org to 'all'");
      setOrganizationIdState("all");
      try {
        localStorage.setItem("activeOrganizationId", "all");
      } catch {}
    } else {
      // NORMAL USER MODE
      let resolved: string | null = null;

      try {
        const stored = localStorage.getItem("activeOrganizationId");
        if (stored && userRoles.some((r) => r.organization_id === stored)) {
          resolved = stored;
        }
      } catch {
        console.warn("⚠ localStorage read error");
      }

      if (!resolved) {
        const firstOrg = userRoles.find((r) => r.organization_id)?.organization_id;
        resolved = firstOrg ?? null;
      }

      console.log("🏢 Resolved org for normal user:", resolved);
      setOrganizationIdState(resolved);

      try {
        if (resolved) localStorage.setItem("activeOrganizationId", resolved);
      } catch {}
    }

    /* ----------------------------------------------------------
       CALCULATE PERMISSIONS
---------------------------------------------------------- */
    if (hasSuper) {
      setPermissions(mergePermissionsForRoles(["super_admin"]));
    } else {
      const activeRoles = userRoles.filter(
        (r) => r.organization_id === organizationIdState
      );
      setPermissions(mergePermissionsForRoles(activeRoles.map((r) => r.role)));
    }

    setUserLoading(false);
  }, [organizationIdState]);

  /* ----------------------------------------------------------
     AUTH LISTENER
---------------------------------------------------------- */
  useEffect(() => {
    refreshUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ----------------------------------------------------------
     RECALCULATE PERMISSIONS ON ORG CHANGE
---------------------------------------------------------- */
  useEffect(() => {
    if (!user || roles.length === 0) {
      setPermissions({});
      return;
    }

    if (isGlobalSuperAdmin && organizationIdState === "all") {
      setPermissions(mergePermissionsForRoles(["super_admin"]));
      return;
    }

    if (isGlobalSuperAdmin) {
      setPermissions(mergePermissionsForRoles(["super_admin"]));
      return;
    }

    const active = roles.filter(
      (r) => r.organization_id === organizationIdState
    );
    setPermissions(mergePermissionsForRoles(active.map((r) => r.role)));
  }, [user, roles, organizationIdState, isGlobalSuperAdmin]);

  return (
    <UserContext.Provider
      value={{
        user,
        userLoading,
        roles,
        isGlobalSuperAdmin,
        organizationId: organizationIdState,
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
