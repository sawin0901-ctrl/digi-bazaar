import { digisellerGet } from "./api.server";

/**
 * Auto-availability system for Digiseller products.
 *
 * - Active products are checked daily.
 * - Hidden products are re-checked every 3 days.
 * - If unavailable: hide (is_active=false), record hidden_at + reason, log event.
 * - If available again: restore (is_active=true, clear hidden_at), log restored.
 * - Hidden for more than 14 days → hard-delete from database.
 */

const HIDE_DAYS = 14;
const HIDDEN_RECHECK_DAYS = 3;

type ProductDataResp = {
  retval: number;
  retdesc?: string;
  desc?: string;
  product?: {
    id: number;
    name?: string;
    in_stock?: number | boolean;
    is_blocked?: number | boolean;
    enabled?: number | boolean;
    available?: number | boolean;
  };
};

export type AvailabilityVerdict =
  | { available: true }
  | { available: false; reason: string };

/**
 * Translate Digiseller's product/data response into a verdict.
 * Reasons map to the categories listed by the user:
 *  - "out_of_stock"   — товар закончился
 *  - "paused"         — продажа приостановлена
 *  - "blocked"        — товар заблокирован
 *  - "unavailable"    — товар недоступен
 *  - "fetch_error"    — ошибка получения товара
 *  - "deleted"        — товар удалён у поставщика
 */
export function verdictFromResponse(json: ProductDataResp | null): AvailabilityVerdict {
  if (!json) return { available: false, reason: "fetch_error" };
  if (json.retval !== 0 || !json.product) {
    const text = (json.retdesc ?? json.desc ?? "").toLowerCase();
    if (text.includes("not found") || text.includes("не найден") || text.includes("удал")) {
      return { available: false, reason: "deleted" };
    }
    if (text.includes("блок")) return { available: false, reason: "blocked" };
    if (text.includes("приост") || text.includes("paus")) return { available: false, reason: "paused" };
    return { available: false, reason: "fetch_error" };
  }
  const p = json.product;
  if (p.is_blocked === true || p.is_blocked === 1) return { available: false, reason: "blocked" };
  if (p.enabled === false || p.enabled === 0) return { available: false, reason: "paused" };
  if (p.in_stock === false || p.in_stock === 0) return { available: false, reason: "out_of_stock" };
  if (p.available === false || p.available === 0) return { available: false, reason: "unavailable" };
  return { available: true };
}

async function fetchVerdict(digisellerId: string): Promise<AvailabilityVerdict> {
  try {
    const json = await digisellerGet<ProductDataResp>(
      `/api/products/${encodeURIComponent(digisellerId)}/data?currency=RUR&lang=ru-RU`,
    );
    const apiVerdict = verdictFromResponse(json);
    if (!apiVerdict.available) return apiVerdict;
    // API claims available — double-check the public storefront page, because
    // Digiseller's product/data endpoint often reports stale stock for OEM /
    // unique-code items. The plati.market page is the same signal the user sees.
    const pageVerdict = await fetchPageVerdict(digisellerId);
    if (pageVerdict && !pageVerdict.available) return pageVerdict;
    return apiVerdict;
  } catch (e) {
    console.error("[availability] fetch failed", digisellerId, e);
    return { available: false, reason: "fetch_error" };
  }
}

/** Public wrapper — used by the import queue to pre-check items. */
export async function fetchVerdictForId(digisellerId: string): Promise<AvailabilityVerdict> {
  return fetchVerdict(digisellerId);
}

/**
 * Scrape the plati.market storefront page for the well-known "sold out" / "blocked"
 * banners. Returns null when the page can't be fetched (treat as inconclusive).
 */
async function fetchPageVerdict(digisellerId: string): Promise<AvailabilityVerdict | null> {
  try {
    const r = await fetch(`https://plati.market/itm/${encodeURIComponent(digisellerId)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GamePlazaAvailabilityBot/1.0; +https://gameplaza.site)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ru,en;q=0.8",
      },
    });
    if (!r.ok) return null;
    const html = (await r.text()).toLowerCase();
    if (
      html.includes("этот товар закончился") ||
      html.includes("товар закончился") ||
      html.includes("sold out")
    ) {
      return { available: false, reason: "out_of_stock" };
    }
    if (html.includes("продажа товара приостановлена") || html.includes("приостановлена продажа")) {
      return { available: false, reason: "paused" };
    }
    if (html.includes("товар заблокирован") || html.includes("заблокирован администрацией")) {
      return { available: false, reason: "blocked" };
    }
    if (
      html.includes("товар удалён") ||
      html.includes("товар удален") ||
      html.includes("товар не найден")
    ) {
      return { available: false, reason: "deleted" };
    }
    return { available: true };
  } catch {
    return null;
  }
}

type ProductRow = {
  id: string;
  slug: string;
  digiseller_id: string | null;
  is_active: boolean;
  hidden_at: string | null;
};

async function logEvent(opts: {
  productId: string | null;
  digisellerId: string | null;
  slug: string | null;
  event: "hidden" | "restored" | "deleted" | "checked";
  reason?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("product_availability_log").insert({
    product_id: opts.productId,
    digiseller_id: opts.digisellerId,
    slug: opts.slug,
    event: opts.event,
    reason: opts.reason ?? null,
  });
}

async function processOne(p: ProductRow): Promise<"hidden" | "restored" | "ok" | "skip"> {
  if (!p.digiseller_id) return "skip";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const verdict = await fetchVerdict(p.digiseller_id);
  const now = new Date().toISOString();

  if (!verdict.available) {
    if (p.is_active || !p.hidden_at) {
      await supabaseAdmin
        .from("products")
        .update({
          is_active: false,
          in_stock: false,
          hidden_at: p.hidden_at ?? now,
          hide_reason: verdict.reason,
          last_checked_at: now,
        })
        .eq("id", p.id);
      await logEvent({
        productId: p.id,
        digisellerId: p.digiseller_id,
        slug: p.slug,
        event: "hidden",
        reason: verdict.reason,
      });
      return "hidden";
    }
    await supabaseAdmin
      .from("products")
      .update({ last_checked_at: now, hide_reason: verdict.reason })
      .eq("id", p.id);
    return "ok";
  }

  // Available
  if (!p.is_active) {
    await supabaseAdmin
      .from("products")
      .update({
        is_active: true,
        in_stock: true,
        hidden_at: null,
        hide_reason: null,
        last_available_at: now,
        last_checked_at: now,
      })
      .eq("id", p.id);
    await logEvent({
      productId: p.id,
      digisellerId: p.digiseller_id,
      slug: p.slug,
      event: "restored",
    });
    return "restored";
  }
  await supabaseAdmin
    .from("products")
    .update({ last_available_at: now, last_checked_at: now, in_stock: true })
    .eq("id", p.id);
  return "ok";
}

export async function checkActiveProducts(limit = 100) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(); // 20h
  const { data: rows } = await supabaseAdmin
    .from("products")
    .select("id, slug, digiseller_id, is_active, hidden_at, last_checked_at")
    .eq("is_active", true)
    .not("digiseller_id", "is", null)
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  const counts = { checked: 0, hidden: 0, restored: 0 };
  for (const r of rows ?? []) {
    counts.checked++;
    const res = await processOne(r as ProductRow);
    if (res === "hidden") counts.hidden++;
    if (res === "restored") counts.restored++;
  }
  return counts;
}

export async function checkHiddenProducts(limit = 100) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - HIDDEN_RECHECK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from("products")
    .select("id, slug, digiseller_id, is_active, hidden_at, last_checked_at")
    .eq("is_active", false)
    .not("digiseller_id", "is", null)
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  const counts = { checked: 0, hidden: 0, restored: 0 };
  for (const r of rows ?? []) {
    counts.checked++;
    const res = await processOne(r as ProductRow);
    if (res === "hidden") counts.hidden++;
    if (res === "restored") counts.restored++;
  }
  return counts;
}

export async function purgeStaleHidden() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - HIDE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from("products")
    .select("id, slug, digiseller_id, hidden_at")
    .eq("is_active", false)
    .not("hidden_at", "is", null)
    .lt("hidden_at", cutoff)
    .limit(500);

  let deleted = 0;
  for (const r of rows ?? []) {
    await logEvent({
      productId: null,
      digisellerId: r.digiseller_id,
      slug: r.slug,
      event: "deleted",
      reason: `hidden_more_than_${HIDE_DAYS}_days`,
    });
    const { error } = await supabaseAdmin.from("products").delete().eq("id", r.id);
    if (!error) deleted++;
  }
  return { deleted };
}

export async function runFullAvailabilityCheck() {
  const active = await checkActiveProducts(150);
  const hidden = await checkHiddenProducts(150);
  const purge = await purgeStaleHidden();
  return { active, hidden, purge };
}