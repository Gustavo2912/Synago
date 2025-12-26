// src/contexts/UserContext.tsx

import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

  organizationId: string | null;
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

/* ----------------------------------------------------
   MERGE ROLE PERMISSIONS
---------------------------------------------------- */
function mergePermissionsForRoles(roleNames: string[]): Record<string, boolean> {
  const merged: Record<string, boolean> = {};

  for (const role of roleNames) {
    const perms = ROLE_PERMISSIONS[role] || [];
    perms.forEach((p) => (merged[p] = true));
  }

  return merged;
}

/* ----------------------------------------------------
   PROVIDER
---------------------------------------------------- */
export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [isGlobalSuperAdmin, setIsGlobalSuperAdmin] = useState(false);

  const [organizationIdState, setOrganizationIdState] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [primaryRole, setPrimaryRole] = useState<string | null>(null);

  /* ----------------------------------------------------
     SET ORG ID — INCLUDING "all"
  ---------------------------------------------------- */
  const setOrganizationId = useCallback((id: string | null) => {
    console.log("⬅ setOrganizationId CALLED WITH:", id);

    // Special case: super_admin selects "all"
    setOrganizationIdState(id);

    try {
      if (id) {
        localStorage.setItem("activeOrganizationId", id);
      } else {
        localStorage.removeItem("activeOrganizationId");
      }
    } catch (err) {
      console.error("LocalStorage error:", err);
    }
  }, []);

  /* ----------------------------------------------------
     LOAD USER + ROLES
  ---------------------------------------------------- */
  const refreshUser = useCallback(async () => {
    console.log("🔄 refreshUser START");
    setUserLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user ?? null;

    console.log("🔍 Session User:", sessionUser);
    setUser(sessionUser);

    if (!sessionUser) {
      console.log("⚠ No user — clearing context state");
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

    /* ------------------ LOAD ROLES ------------------ */
    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", sessionUser.id);

    if (roleErr) {
      console.error("❌ Failed loading roles:", roleErr);
      setUserLoading(false);
      return;
    }

    const userRoles = roleRows || [];
    console.log("🧩 Loaded user_roles:", userRoles);
    setRoles(userRoles);

    /* ------------------ CHECK SUPER ADMIN ------------------ */
    const hasSuper = userRoles.some((r) => r.role === "super_admin");
    setIsGlobalSuperAdmin(hasSuper);

    /* ------------------ PRIMARY ROLE ------------------ */
    const primary =
      (hasSuper && "super_admin") ||
      (userRoles.length > 0 ? userRoles[0].role : null);

    setPrimaryRole(primary);

    /* ------------------ DETERMINE ORGANIZATION ID ------------------ */
    let orgId: string | null = null;

    try {
      const stored = localStorage.getItem("activeOrganizationId");
      console.log("📦 Stored org ID:", stored);

      if (stored === "all" && hasSuper) {
        orgId = "all"; // global mode allowed
      } else if (
        stored &&
        userRoles.some((r) => r.organization_id === stored)
      ) {
        orgId = stored;
      }
    } catch {
      console.warn("⚠ localStorage read error");
    }

    // If still empty → default to first org
    if (!orgId) {
      const firstOrg = userRoles.find((r) => r.organization_id)?.organization_id;
      orgId = firstOrg ?? null;
    }

    console.log("🏢 Final resolved organizationId:", orgId);
    setOrganizationIdState(orgId);

    /* ------------------ PERMISSIONS ------------------ */
    if (hasSuper) {
      setPermissions(mergePermissionsForRoles(["super_admin"]));
    } else {
      const activeRoles = userRoles.filter(
        (r) => !orgId || r.organization_id === orgId
      );
      setPermissions(mergePermissionsForRoles(activeRoles.map((r) => r.role)));
    }

    setUserLoading(false);
  }, []);

  /* ----------------------------------------------------
     AUTH LISTENER
---------------------------------------------------- */
  useEffect(() => {
    refreshUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ----------------------------------------------------
     PERMISSIONS WHEN ORG CHANGES
---------------------------------------------------- */
  useEffect(() => {
    console.log("🔁 Org changed. Recalculate permissions.");

    if (!user || roles.length === 0) {
      setPermissions({});
      return;
    }

    // SUPER ADMIN in "all" → unrestricted
    if (isGlobalSuperAdmin && organizationIdState === "all") {
      const allRoles = roles.map((r) => r.role);
      setPermissions(mergePermissionsForRoles(allRoles));
      return;
    }

    // SUPER ADMIN in specific org
    if (isGlobalSuperAdmin) {
      setPermissions(mergePermissionsForRoles(["super_admin"]));
      return;
    }

    // NORMAL USER
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
