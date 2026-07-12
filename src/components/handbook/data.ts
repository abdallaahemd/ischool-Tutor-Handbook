import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order: number;
}

export interface Card {
  id: string;
  category_id: string;
  header: string;
  body: string;
  icon_style: string;
  icon: string;
  view_link: string | null;
  open_link: string;
  order: number;
  sheet_filters?: string[] | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("order", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useAllCards() {
  return useQuery({
    queryKey: ["cards"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .order("order", { ascending: true });
      if (error) throw error;
      return data as Card[];
    },
  });
}

export function useCardsByCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["cards", categoryId],
    enabled: !!categoryId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("category_id", categoryId!)
        .order("order", { ascending: true });
      if (error) throw error;
      return data as Card[];
    },
  });
}