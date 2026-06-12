import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// URL e chave publishable são públicas por design — a proteção dos dados é o RLS.
// Podem ser sobrescritas via .env (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://hacobjcbamavimzdtcki.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_HmnNYOST7wLbTb94s_QFSg_WrCk5r3s";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
