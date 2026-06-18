import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

const AGENT_ID = "1459731";
function buyUrl(digisellerId: string): string {
  return `https://www.oplata.info/asp2/pay_wm.asp?id_d=${digisellerId}&ai=${AGENT_ID}&_ow=0`;
}

/** Walk every product, strip plati.market URLs (in text + jsonb fields) and
 *  replace recognized ids with internal /product/<slug>. Also rewrites
 *  details_url / buy_url to the new safe URLs. Admin-only. */
export const cleanupPlatiLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as never as typeof context.supabase;
    const { sanitizePlatiValue, extractPlatiIdsDeep } = await import("@/lib/quality/sanitize");

    // 1) build a global slug map from all known digiseller_ids.
    const { data: all } = await db
      .from("products")
      .select("digiseller_id, slug")
      .not("digiseller_id", "is", null);
    const slugMap = new Map<string, string>();
    for (const r of all ?? []) {
      if (r.digiseller_id && r.slug) slugMap.set(r.digiseller_id, r.slug);
    }

    // 2) walk products in batches and sanitize each text/jsonb field.
    const limit = Math.max(1, Math.min(5000, data.limit ?? 2000));
    const { data: rows } = await db
      .from("products")
      .select(
        "id, slug, digiseller_id, description, short_description, full_description, instructions, seo_title, seo_description, seo_keywords, seo_h1, advantages, features, faq, image_meta, keywords_grouped, details_url, buy_url",
      )
      .limit(limit);

    let updated = 0;
    let enqueued = 0;
    for (const r of rows ?? []) {
      const patch: Record<string, unknown> = {};
      // collect unknown ids → enqueue later
      const ids = extractPlatiIdsDeep(r).filter((id) => id !== r.digiseller_id && !slugMap.has(id));
      if (ids.length) {
        await db
          .from("product_import_queue")
          .upsert(
            ids.map((digiseller_id) => ({
              digiseller_id,
              source_product_id: r.id,
              status: "pending",
            })),
            { onConflict: "digiseller_id", ignoreDuplicates: true },
          );
        enqueued += ids.length;
      }
      for (const k of [
        "description",
        "short_description",
        "full_description",
        "instructions",
        "seo_title",
        "seo_description",
        "seo_keywords",
        "seo_h1",
      ] as const) {
        const v = (r as Record<string, unknown>)[k];
        if (typeof v === "string") {
          const cleaned = sanitizePlatiValue(v, slugMap);
          if (cleaned !== v) patch[k] = cleaned;
        }
      }
      for (const k of ["advantages", "features", "faq", "image_meta", "keywords_grouped"] as const) {
        const v = (r as Record<string, unknown>)[k];
        if (v != null) {
          const cleaned = sanitizePlatiValue(v, slugMap);
          if (JSON.stringify(cleaned) !== JSON.stringify(v)) patch[k] = cleaned;
        }
      }
      // Always rewrite details_url to internal + buy_url to Digiseller payment.
      const wantDetails = `/product/${r.slug}`;
      if (r.details_url !== wantDetails) patch.details_url = wantDetails;
      if (r.digiseller_id) {
        const wantBuy = buyUrl(r.digiseller_id);
        if (r.buy_url !== wantBuy) patch.buy_url = wantBuy;
      }
      if (Object.keys(patch).length > 0) {
        const { error } = await db.from("products").update(patch).eq("id", r.id);
        if (!error) updated++;
      }
    }
    return { ok: true, scanned: rows?.length ?? 0, updated, enqueued };
  });

/** Re-evaluate quality for a batch of products and toggle is_active accordingly. */
export const bulkRecheckQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as never as typeof context.supabase;
    const { evaluateProduct } = await import("@/lib/quality/sanitize");
    const limit = Math.max(1, Math.min(5000, data.limit ?? 2000));
    const { data: rows } = await db
      .from("products")
      .select("id, title, description, image, price, in_stock")
      .limit(limit);
    let activated = 0;
    let deactivated = 0;
    const now = new Date().toISOString();
    for (const r of rows ?? []) {
      const v = evaluateProduct({
        title: r.title ?? "",
        description: r.description ?? "",
        image: r.image ?? "",
        price: r.price ?? 0,
        in_stock: r.in_stock ?? false,
      });
      const { error } = await db
        .from("products")
        .update({
          is_active: v.ok,
          quality_issues: v.issues,
          last_quality_check_at: now,
        })
        .eq("id", r.id);
      if (!error) {
        if (v.ok) activated++;
        else deactivated++;
      }
    }
    return { ok: true, scanned: rows?.length ?? 0, activated, deactivated };
  });