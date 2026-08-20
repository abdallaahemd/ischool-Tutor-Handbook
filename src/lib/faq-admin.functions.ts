import { createServerFn } from "@tanstack/react-start";

async function verifyFaqAdmin(adminId: string) {
  if (!adminId) throw new Error("Not authorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("id", adminId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Not authorized");
  return supabaseAdmin;
}

/* ---------------- Categories ---------------- */
export interface FaqCategoryInput {
  admin_id: string;
  id?: string;
  name: string;
  description: string;
}

export const upsertFaqCategory = createServerFn({ method: "POST" })
  .inputValidator((d: FaqCategoryInput) => d)
  .handler(async ({ data }) => {
    const db = await verifyFaqAdmin(data.admin_id);
    const payload = { name: data.name.trim(), description: data.description };
    if (!payload.name) throw new Error("Category name is required");
    const { data: row, error } = data.id
      ? await db.from("faq_categories").update(payload).eq("id", data.id).select().maybeSingle()
      : await db.from("faq_categories").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteFaqCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { admin_id: string; id: string }) => d)
  .handler(async ({ data }) => {
    const db = await verifyFaqAdmin(data.admin_id);
    const { error } = await db.from("faq_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Topics ---------------- */
export interface FaqTopicInput {
  admin_id: string;
  id?: string;
  category_id: string;
  title: string;
  main_question: string;
  answer: string;
  status: string;
  priority: string;
}

export const upsertFaqTopic = createServerFn({ method: "POST" })
  .inputValidator((d: FaqTopicInput) => d)
  .handler(async ({ data }) => {
    const db = await verifyFaqAdmin(data.admin_id);
    if (!data.category_id) throw new Error("A FAQ category is required");
    if (!data.main_question.trim()) throw new Error("The canonical question is required");
    if (!data.answer.trim()) throw new Error("The official answer is required");
    const payload = {
      category_id: data.category_id,
      title: data.title.trim() || data.main_question.trim().slice(0, 120),
      main_question: data.main_question.trim(),
      answer: data.answer.trim(),
      status: data.status,
      priority: data.priority,
      last_verified_at: data.status === "verified" ? new Date().toISOString() : null,
    };
    const { data: row, error } = data.id
      ? await db.from("faq_knowledge_topics").update(payload).eq("id", data.id).select().maybeSingle()
      : await db.from("faq_knowledge_topics").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteFaqTopic = createServerFn({ method: "POST" })
  .inputValidator((d: { admin_id: string; id: string }) => d)
  .handler(async ({ data }) => {
    const db = await verifyFaqAdmin(data.admin_id);
    const { error } = await db.from("faq_knowledge_topics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFaqTopics = createServerFn({ method: "POST" })
  .inputValidator((d: { admin_id: string }) => d)
  .handler(async ({ data }) => {
    const db = await verifyFaqAdmin(data.admin_id);
    const { data: rows, error } = await db
      .from("faq_knowledge_topics")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

/* ---------------- Variants ---------------- */
export const listFaqVariants = createServerFn({ method: "POST" })
  .inputValidator((d: { admin_id: string; topic_id: string }) => d)
  .handler(async ({ data }) => {
    const db = await verifyFaqAdmin(data.admin_id);
    const { data: rows, error } = await db
      .from("faq_question_variants")
      .select("*")
      .eq("topic_id", data.topic_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const addFaqVariant = createServerFn({ method: "POST" })
  .inputValidator((d: { admin_id: string; topic_id: string; variant: string }) => d)
  .handler(async ({ data }) => {
    const db = await verifyFaqAdmin(data.admin_id);
    const variant = data.variant.trim();
    if (!variant) throw new Error("Variant text is required");
    const { error } = await db
      .from("faq_question_variants")
      .insert({ topic_id: data.topic_id, variant, normalized_variant: variant.toLowerCase() });
    if (error) {
      if (error.code === "23505") throw new Error("This wording already exists on the topic");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteFaqVariant = createServerFn({ method: "POST" })
  .inputValidator((d: { admin_id: string; id: string }) => d)
  .handler(async ({ data }) => {
    const db = await verifyFaqAdmin(data.admin_id);
    const { error } = await db.from("faq_question_variants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Duplicate detection ---------------- */
export interface FaqSimilarHit {
  topic_id: string;
  title: string;
  main_question: string;
  status: string;
  matched_variant: string | null;
  score: number;
}

export const findSimilarFaq = createServerFn({ method: "POST" })
  .inputValidator((d: { admin_id: string; question: string }) => d)
  .handler(async ({ data }) => {
    const db = await verifyFaqAdmin(data.admin_id);
    const { data: rows, error } = await db.rpc("faq_find_similar", {
      _question: data.question,
      _limit: 5,
    });
    if (error) throw new Error(error.message);
    return { rows: ((rows ?? []) as unknown as FaqSimilarHit[]).filter((r) => r.score > 0.3) };
  });

/* ---------------- Audit ---------------- */
export const listFaqAudit = createServerFn({ method: "POST" })
  .inputValidator((d: { admin_id: string }) => d)
  .handler(async ({ data }) => {
    const db = await verifyFaqAdmin(data.admin_id);
    const { data: rows, error } = await db
      .from("faq_audit_logs")
      .select("id, action, table_name, record_id, created_at, new_data")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });
