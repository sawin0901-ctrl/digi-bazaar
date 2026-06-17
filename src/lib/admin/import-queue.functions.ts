import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AuthedSupabase = SupabaseClient<Database>;

async function assertAdmin(supabase: AuthedSupabase, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export type ImportQueueRow = {
  id: string;
  digiseller_id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
  source_product_id: string | null;
};

export const adminListImportQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    rows: ImportQueueRow[];
    stats: { pending: number; done: number; failed: number; total: number };
  }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("product_import_queue")
      .select("id,digiseller_id,status,attempts,last_error,created_at,processed_at,source_product_id")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as ImportQueueRow[];
    const stats = {
      pending: rows.filter((r) => r.status === "pending").length,
      done: rows.filter((r) => r.status === "done").length,
      failed: rows.filter((r) => r.status === "failed").length,
      total: rows.length,
    };
    return { rows, stats };
  });

export const adminRunImportNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { processOneFromImportQueue } = await import("@/lib/digiseller/sync.server");
    return await processOneFromImportQueue();
  });

export const adminEnqueueImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { digisellerId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const id = data.digisellerId.trim();
    if (!/^\d{3,}$/.test(id)) throw new Error("Некорректный ID товара");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("product_import_queue")
      .upsert([{ digiseller_id: id, status: "pending" }], {
        onConflict: "digiseller_id",
        ignoreDuplicates: true,
      });
    return { ok: true };
  });

export const adminRetryFailedImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("product_import_queue")
      .update({ status: "pending", attempts: 0, last_error: null })
      .eq("id", data.id);
    return { ok: true };
  });

export const adminDeleteQueueRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("product_import_queue").delete().eq("id", data.id);
    return { ok: true };
  });