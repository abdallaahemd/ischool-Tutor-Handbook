import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FaqStatus = "draft" | "verified" | "needs_review" | "archived";
export type FaqPriority = "normal" | "important" | "critical";

export interface FaqCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaqTopic {
  id: string;
  category_id: string;
  title: string;
  main_question: string;
  answer: string;
  status: FaqStatus;
  priority: FaqPriority;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaqVariant {
  id: string;
  topic_id: string;
  variant: string;
  normalized_variant: string;
  created_at: string;
}

export interface FaqSearchHit {
  topic_id: string;
  title: string;
  main_question: string;
  answer: string;
  status: FaqStatus;
  priority: FaqPriority;
  category_id: string | null;
  category_name: string | null;
  matched_variant: string | null;
  /** How the row was matched: exact | canonical | variant | keyword. */
  match_type?: "exact" | "canonical" | "variant" | "keyword";
  score: number;

}

export function useFaqCategories() {
  return useQuery({
    queryKey: ["faq_categories"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FaqCategory[];
    },
  });
}

/** Verified topics only — enforced by row-level security for public readers. */
export function useFaqTopics(categoryId?: string) {
  return useQuery({
    queryKey: ["faq_topics", categoryId ?? "all"],
    staleTime: 0,
    queryFn: async () => {
      let q = supabase
        .from("faq_knowledge_topics")
        .select("*")
        .eq("status", "verified")
        .order("priority", { ascending: false })
        .order("title", { ascending: true });
      if (categoryId) q = q.eq("category_id", categoryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FaqTopic[];
    },
  });
}

export async function askFaq(question: string, limit = 4): Promise<FaqSearchHit[]> {
  const { data, error } = await supabase.rpc("faq_search", {
    _query: question,
    _limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as unknown as FaqSearchHit[];
}
