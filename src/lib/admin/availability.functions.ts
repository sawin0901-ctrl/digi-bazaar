import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export type AvailabilityProduct = {
  id: string;
  slug: string;
  title: string;
  digiseller_id: string | null;
  is_active: boolean;
  hidden_at: string | null;
  hide_reason: string | null;
  last_checked_at: string | null;
  last_available_at: string | null;
  days_hidden: number | null;
};

export type AvailabilityLogEntry = {
  id: string;
  product_id: string | null;
  digiseller_id: string | null;
  slug: string | null;
  event: string;
  reason: string | null;
  created_at: string;
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

export const adminAvailabilityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: activeCount }, { count: hiddenCount }, { data: hiddenRows }, { data: logRows }] =
      await Promise.all([
        supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("is_active", false),
        supabaseAdmin
          .from("products")
          .select("id,slug,title,digiseller_id,is_active,hidden_at,hide_reason,last_checked_at,last_available_at")
          .eq("is_active", false)
          .order("hidden_at", { ascending: true, nullsFirst: false })
          .limit(200),
        supabaseAdmin
          .from("product_availability_log")
          .select("id,product_id,digiseller_id,slug,event,reason,created_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    const hidden: AvailabilityProduct[] = (hiddenRows ?? []).map((r) => ({
      ...r,
      days_hidden: daysSince(r.hidden_at),
    }));
    const pendingDelete = hidden.filter((h) => (h.days_hidden ?? 0) >= 14);

    return {
      stats: {
        active: activeCount ?? 0,
        hidden: hiddenCount ?? 0,
        pending_delete: pendingDelete.length,
      },
      hidden,
      pending_delete: pendingDelete,
      log: (logRows ?? []) as AvailabilityLogEntry[],
    };
  });

export const adminRunAvailabilityNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { runFullAvailabilityCheck } = await import("@/lib/digiseller/availability.server");
    return runFullAvailabilityCheck();
  });