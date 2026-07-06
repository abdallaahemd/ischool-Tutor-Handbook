import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "search_resources",
  title: "Search handbook resources",
  description:
    "Search resource cards in the iSchool Tutor Handbook by matching text in the header or body.",
  inputSchema: {
    query: z.string().min(1).describe("Search text to match against card header/body."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const escaped = query.replace(/[%,]/g, " ").trim();
    const { data, error } = await supabase
      .from("cards")
      .select("id,category_id,header,body,view_link,open_link,order")
      .or(`header.ilike.%${escaped}%,body.ilike.%${escaped}%`)
      .order("order", { ascending: true })
      .limit(50);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { results: data ?? [] },
    };
  },
});