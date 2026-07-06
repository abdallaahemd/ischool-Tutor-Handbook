import { defineMcp } from "@lovable.dev/mcp-js";
import listCategories from "./tools/list-categories";
import listCards from "./tools/list-cards";
import searchResources from "./tools/search-resources";

export default defineMcp({
  name: "ischool-tutor-handbook-mcp",
  title: "iSchool Tutor Handbook MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the iSchool Tutor Handbook. Use `list_categories` to browse sections (CS Cases, System, Policies, etc.), `list_cards` to see resource cards in a category, and `search_resources` to search across cards.",
  tools: [listCategories, listCards, searchResources],
});