import { createServerFn } from "@tanstack/react-start";

async function verifyAdmin(adminId: string) {
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

export interface CategoryInput {
  admin_id: string;
  id?: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order: number;
}

export const upsertCategory = createServerFn({ method: "POST" })
  .inputValidator((d: CategoryInput) => d)
  .handler(async ({ data }) => {
    const db = await verifyAdmin(data.admin_id);
    const payload = {
      name: data.name,
      slug: data.slug,
      icon: data.icon,
      description: data.description,
      order: data.order,
    };
    const { data: row, error } = data.id
      ? await db.from("categories").update(payload).eq("id", data.id).select().maybeSingle()
      : await db.from("categories").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { admin_id: string; id: string }) => d)
  .handler(async ({ data }) => {
    const db = await verifyAdmin(data.admin_id);
    const { error } = await db.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export interface CardInput {
  admin_id: string;
  id?: string;
  category_id: string;
  header: string;
  body: string;
  icon_style: string;
  icon: string;
  view_link: string | null;
  open_link: string;
  order: number;
}

export const upsertCard = createServerFn({ method: "POST" })
  .inputValidator((d: CardInput) => d)
  .handler(async ({ data }) => {
    const db = await verifyAdmin(data.admin_id);
    const payload = {
      category_id: data.category_id,
      header: data.header,
      body: data.body,
      icon_style: data.icon_style,
      icon: data.icon,
      view_link: data.view_link,
      open_link: data.open_link,
      order: data.order,
    };
    const { data: row, error } = data.id
      ? await db.from("cards").update(payload).eq("id", data.id).select().maybeSingle()
      : await db.from("cards").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteCard = createServerFn({ method: "POST" })
  .inputValidator((d: { admin_id: string; id: string }) => d)
  .handler(async ({ data }) => {
    const db = await verifyAdmin(data.admin_id);
    const { error } = await db.from("cards").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
