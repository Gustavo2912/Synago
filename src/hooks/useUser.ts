import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUser() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  // Load session + listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Load profile + role + organization
  useEffect(() => {
    const load = async () => {
      if (!session?.user?.id) {
        setProfile(null);
        setRole(null);
        setOrganization(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const userId = session.user.id;

      // 1) load profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      setProfile(prof || null);

      // 2) load role + organization
      const { data: roleData } = await supabase
        .from("user_roles")
        .select(`
          role,
          organization_id,
          organizations (*)
        `)
        .eq("user_id", userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role);
        setOrganization(roleData.organizations);
      } else {
        setRole(null);
        setOrganization(null);
      }

      setLoading(false);
    };

    load();
  }, [session]);

  return {
    loading,
    isLoggedIn: !!session,
    session,
    profile,
    role,
    organization,
  };
}
