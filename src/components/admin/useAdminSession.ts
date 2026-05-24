import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdminSession() {
  const [state, setState] = useState<{
    loading: boolean;
    userId: string | null;
    isAdmin: boolean;
  }>({ loading: true, userId: null, isAdmin: false });

  useEffect(() => {
    let cancelled = false;

    const check = async (userId: string | null) => {
      if (!userId) {
        if (!cancelled) setState({ loading: false, userId: null, isAdmin: false });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled)
        setState({ loading: false, userId, isAdmin: !!data });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      check(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => check(data.session?.user?.id ?? null));

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}