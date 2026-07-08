import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCategories from "./tools/list-categories";
import listCards from "./tools/list-cards";
import searchResources from "./tools/search-resources";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ischool-tutor-handbook-mcp",
  title: "iSchool Tutor Handbook MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the iSchool Tutor Handbook. Use `list_categories` to browse sections (CS Cases, System, Policies, etc.), `list_cards` to see resource cards in a category, and `search_resources` to search across cards.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCategories, listCards, searchResources],
});