import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMeTool from "./tools/get-me";
import listRoomsTool from "./tools/list-rooms";
import listNotificationsTool from "./tools/list-notifications";

// The OAuth issuer must be the direct Supabase host (never the .lovable.cloud proxy).
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time, so this stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nova-mcp",
  title: "NOVA Voice Chat",
  version: "0.1.0",
  instructions:
    "Tools for NOVA voice chat. Use `get_me` for the signed-in user's profile and balances, `list_rooms` to browse active voice rooms, and `list_my_notifications` for recent notifications. All tools act as the signed-in NOVA user under row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMeTool, listRoomsTool, listNotificationsTool],
});
