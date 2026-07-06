import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_cards",
  title: "List handbook resource cards",
  description:
    "List resource cards in the iSchool Tutor Handbook. Optionally filter by category slug.",
  inputSchema: {
    category_slug: z
      .string()
      .optional()
      .describe("Optional category slug (e.g. 'cs-cases') to filter cards."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category_slug }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let categoryId: string | undefined;
    if (category_slug) {
      const { data: cat, error: cErr } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category_slug)
        .maybeSingle();
      if (cErr) {
        return { content: [{ type: "text", text: cErr.message }], isError: true };
      }
      if (!cat) {
        return {
          content: [{ type: "text", text: `No category with slug '${category_slug}'` }],
          isError: true,
        };
      }
      categoryId = cat.id as string;
    }

    let q = supabase
      .from("cards")
      .select("id,category_id,header,body,icon,icon_style,view_link,open_link,order")
      .order("order", { ascending: true });
    if (categoryId) q = q.eq("category_id", categoryId);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { cards: data ?? [] },
    };
  },
});