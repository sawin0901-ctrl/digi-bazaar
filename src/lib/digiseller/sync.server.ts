import { digisellerPost, digisellerGet, getSellerId } from "./api.server";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
type DB = SupabaseClient<Database>;

async function resolveDb(db?: DB): Promise<DB> {
  if (db) return db;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as DB;
}

const AGENT_ID = "1459731";

type Row = {
  id_goods: number;
  name: string;
  price?: number;
  price_rur?: number;
  cnt_sell?: number;
  cnt_comment?: number;
  has_discount?: boolean;
  url_image?: string | null;
  image?: string | null;
};
type SellerGoodsResp = {
  retval: number;
  desc?: string;
  retdesc?: string;
  total_pages?: number;
  cnt_goods?: number;
  rows?: Row[];
  product?: Row[];
};
type CategoryNode = { id: number; name: string; sub?: CategoryNode[] };
type CategoriesResp = { retval: number; category?: CategoryNode[] };

type ProductDataResp = {
  retval: number;
  retdesc?: string;
  product?: {
    id: number;
    name?: string;
    info?: string;
    add_info?: string;
    price?: { price: number; currency: string };
    prices_unit?: { price_rub?: number };
    image?: string;
    base_url?: string;
    in_stock?: number | boolean;
    cnt_sell?: number;
    preview_imgs?: Array<{ id?: number; url?: string; width?: number; height?: number }>;
    statistics?: {
      sales?: number;
      good_reviews?: number;
      bad_reviews?: number;
    };
    seller?: { id?: number; name?: string };
  };
};

function computeSellerStats(pd: NonNullable<ProductDataResp["product"]>) {
  const good = Number(pd.statistics?.good_reviews ?? 0);
  const bad = Number(pd.statistics?.bad_reviews ?? 0);
  const total = good + bad;
  const reviews = total;
  const rating = total > 0 ? Math.max(1, Math.min(5, Number(((good * 5) / total).toFixed(1)))) : 5;
  const sales = Number(pd.statistics?.sales ?? pd.cnt_sell ?? 0);
  const sellerName = (pd.seller?.name ?? "").trim() || "plati.market";
  return { reviews, rating, sales, sellerName };
}

function extractImages(pd: NonNullable<ProductDataResp["product"]>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string | null | undefined) => {
    if (!u) return;
    const url = u.trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  push(pd.image);
  for (const p of pd.preview_imgs ?? []) push(p?.url);
  // also try to extract <img src="..."> from info HTML
  const html = (pd.info ?? "") + "\n" + (pd.add_info ?? "");
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) push(m[1]);
  return out;
}

function extractVideos(pd: NonNullable<ProductDataResp["product"]>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string | null | undefined) => {
    if (!u) return;
    let url = u.trim();
    if (!url) return;
    if (url.startsWith("//")) url = "https:" + url;
    if (seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  const html = (pd.info ?? "") + "\n" + (pd.add_info ?? "");
  // iframes (youtube/vimeo/rutube embeds)
  const reIframe = /<iframe[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = reIframe.exec(html)) !== null) {
    const src = m[1];
    if (/youtube\.com|youtu\.be|vimeo\.com|rutube\.ru|vk\.com\/video/i.test(src)) push(src);
  }
  // <video src=...>
  const reVideo = /<video[^>]+src=["']([^"']+)["']/gi;
  while ((m = reVideo.exec(html)) !== null) push(m[1]);
  // bare youtube/vimeo links
  const reLink = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|vimeo\.com\/\d+|rutube\.ru\/video\/[\w-]+)/gi;
  while ((m = reLink.exec(html)) !== null) push(m[0]);
  return out;
}

function productUrl(id: number): string {
  // Digiseller payment URL — no plati.market brand exposure on the site.
  return `https://www.oplata.info/asp2/pay_wm.asp?id_d=${id}&ai=${AGENT_ID}&_ow=0`;
}

function internalProductUrl(slug: string): string {
  return `/product/${slug}`;
}

/** Build slug map for a set of digiseller ids (used by sanitizer). */
async function buildSlugMap(db: DB, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await db
    .from("products")
    .select("digiseller_id, slug")
    .in("digiseller_id", ids);
  for (const r of data ?? []) {
    if (r.digiseller_id && r.slug) map.set(r.digiseller_id, r.slug);
  }
  return map;
}

/** Sanitize a product-shaped payload in place: removes plati.market links from
 *  every text/jsonb field and replaces them with internal URLs. Unknown ids
 *  are enqueued for import and become `[[PLATI:<id>]]` markers, which are
 *  rewritten later by `resolveMarkersForProduct`. */
async function sanitizePayloadInPlace<T extends Record<string, unknown>>(
  db: DB,
  payload: T,
  selfDigisellerId: string | null,
): Promise<T> {
  const { sanitizePlatiValue, extractPlatiIdsDeep } = await import("@/lib/quality/sanitize");
  const ids = extractPlatiIdsDeep(payload).filter((x) => x !== selfDigisellerId);
  if (ids.length) {
    try {
      await enqueuePlatiIds(db, ids, null);
    } catch (e) {
      console.error("[sync] enqueue ids from payload failed", e);
    }
  }
  const slugMap = await buildSlugMap(db, ids);
  const TEXT_FIELDS = [
    "description",
    "short_description",
    "full_description",
    "instructions",
    "seo_title",
    "seo_description",
    "seo_keywords",
    "seo_h1",
  ] as const;
  const JSON_FIELDS = ["advantages", "features", "faq", "image_meta", "keywords_grouped"] as const;
  for (const k of TEXT_FIELDS) {
    if (typeof payload[k] === "string") {
      (payload as Record<string, unknown>)[k] = sanitizePlatiValue(payload[k] as string, slugMap);
    }
  }
  for (const k of JSON_FIELDS) {
    if (payload[k] != null) {
      (payload as Record<string, unknown>)[k] = sanitizePlatiValue(payload[k], slugMap);
    }
  }
  return payload;
}

/** After a row exists, apply quality gating to decide if it should be public. */
async function applyQualityGate(
  db: DB,
  productId: string,
  ctx: { title: string; description: string; image: string; price: number; in_stock: boolean },
): Promise<void> {
  const { evaluateProduct } = await import("@/lib/quality/sanitize");
  const verdict = evaluateProduct(ctx);
  await db
    .from("products")
    .update({
      is_active: verdict.ok,
      quality_issues: verdict.issues,
      last_quality_check_at: new Date().toISOString(),
    })
    .eq("id", productId);
}

/** Fetch plati.market product page and extract the top-level catalog
 *  breadcrumb (e.g. "Игры", "Программное обеспечение"). Returns null if
 *  the page cannot be parsed.
 */
async function fetchPlatiTopCategory(itemId: string): Promise<{ slug: string; name: string } | null> {
  try {
    const res = await fetch(`https://plati.market/itm/${itemId}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Crumbs look like: <a href="/cat/<slug>/<id>/"><span>Name</span></a>
    const re = /<a[^>]+href="\/cat\/([^"\/]+)\/\d+\/?"[^>]*>\s*<span[^>]*>([^<]+)<\/span>\s*<\/a>/gi;
    const m = re.exec(html);
    if (!m) return null;
    const slug = m[1].trim().toLowerCase();
    const name = m[2].trim();
    if (!slug || !name) return null;
    return { slug: `plati-${slug}`, name };
  } catch {
    return null;
  }
}

async function ensureCategoryRow(db: DB, slug: string, name: string) {
  // Insert only when missing; don't clobber name/image/sort_order if a curated
  // row already exists for this slug.
  const { data: existing } = await db
    .from("categories")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!existing) {
    await db
      .from("categories")
      .insert({ slug, name, is_active: true });
  }
}

/** Backfill category.image from a product image if the category has none yet. */
async function ensureCategoryImage(db: DB, slug: string, image: string | null) {
  if (!image) return;
  const { data: cat } = await db
    .from("categories")
    .select("slug,image")
    .eq("slug", slug)
    .maybeSingle();
  if (cat && !cat.image) {
    await db.from("categories").update({ image }).eq("slug", slug);
  }
}

/** Extract numeric plati.market itm IDs from arbitrary text/HTML. */
export function extractPlatiItemIds(text: string | null | undefined): string[] {
  if (!text) return [];
  const out = new Set<string>();
  // plati.market product URLs come in two shapes:
  //   .../itm/<slug>/<numeric-id>   (canonical, slug may itself contain digits)
  //   .../itm/<numeric-id>          (short form without slug)
  // Capture the trailing numeric segment of the path in both cases.
  const re = /plati\.market\/itm\/(?:[^\s"'<>)]+?\/)?(\d{6,})(?![\w-])/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

/** Enqueue newly seen plati.market item IDs for background auto-import. */
async function enqueuePlatiIds(db: DB, ids: string[], sourceProductId: string | null) {
  if (ids.length === 0) return;
  // Skip ids that already exist as products
  const { data: existing } = await db
    .from("products")
    .select("digiseller_id")
    .in("digiseller_id", ids);
  const have = new Set((existing ?? []).map((r) => r.digiseller_id));
  const fresh = ids.filter((id) => !have.has(id));
  if (fresh.length === 0) return;
  await db
    .from("product_import_queue")
    .upsert(
      fresh.map((id) => ({
        digiseller_id: id,
        source_product_id: sourceProductId,
        status: "pending",
      })),
      { onConflict: "digiseller_id", ignoreDuplicates: true },
    );
}

/** Replace any plati.market product URLs in `text` with internal /product/<slug>
 *  links for products that already exist in our DB. Leaves unknown ids untouched
 *  (they should be enqueued separately and rewritten on a later pass). */
export async function rewritePlatiLinksToInternal(text: string, providedDb?: DB): Promise<string> {
  if (!text) return text;
  const ids = extractPlatiItemIds(text);
  if (ids.length === 0) return text;
  const db = await resolveDb(providedDb);
  const { data } = await db
    .from("products")
    .select("digiseller_id, slug")
    .in("digiseller_id", ids);
  const map = new Map<string, string>();
  for (const r of data ?? []) {
    if (r.digiseller_id && r.slug) map.set(r.digiseller_id, r.slug);
  }
  if (map.size === 0) return text;
  return text.replace(
    /https?:\/\/(?:www\.)?plati\.market\/itm\/(?:[^\s"'<>)]+?\/)?(\d{6,})(?:\?[^\s"'<>)]*)?/gi,
    (full, id: string) => {
      const slug = map.get(id);
      return slug ? `/product/${slug}` : full;
    },
  );
}

/** After a product is (re)imported, walk other products whose description
 *  still contains an external plati.market link to this digiseller_id and
 *  rewrite those links to internal /product/<slug> URLs. */
export async function refreshBacklinksFor(digisellerId: string, providedDb?: DB): Promise<number> {
  const db = await resolveDb(providedDb);
  const { data } = await db
    .from("products")
    .select("id, description, digiseller_id")
    .ilike("description", `%plati.market/itm/%${digisellerId}%`)
    .limit(500);
  let updated = 0;
  for (const p of data ?? []) {
    if (p.digiseller_id === digisellerId) continue;
    const newDesc = await rewritePlatiLinksToInternal(p.description ?? "", db);
    if (newDesc && newDesc !== p.description) {
      const { error } = await db
        .from("products")
        .update({ description: newDesc })
        .eq("id", p.id);
      if (!error) updated++;
    }
  }
  return updated;
}

/** Process one queued plati.market item — invoked by hourly cron. */
export async function processOneFromImportQueue(providedDb?: DB): Promise<
  { processed: false } | { processed: true; digiseller_id: string; ok: boolean; error?: string }
> {
  const db = await resolveDb(providedDb);
  const { data: row } = await db
    .from("product_import_queue")
    .select("id, digiseller_id, attempts")
    .eq("status", "pending")
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!row) return { processed: false };
  try {
    // Pre-check availability via the same signals used by the auto-availability
    // cron (Digiseller API + plati.market page scrape). If the item is already
    // unavailable, drop it from the queue immediately instead of importing a
    // dead card.
    const { fetchVerdictForId } = await import("./availability.server");
    const verdict = await fetchVerdictForId(row.digiseller_id);
    if (!verdict.available) {
      await db
        .from("product_import_queue")
        .delete()
        .eq("id", row.id);
      await db.from("product_availability_log").insert({
        product_id: null,
        digiseller_id: row.digiseller_id,
        slug: null,
        event: "deleted",
        reason: `queue_skip:${verdict.reason}`,
      });
      return {
        processed: true,
        digiseller_id: row.digiseller_id,
        ok: false,
        error: `skipped: ${verdict.reason}`,
      };
    }
    await importDigisellerProductById(row.digiseller_id, null, db);
    await db
      .from("product_import_queue")
      .update({ status: "done", processed_at: new Date().toISOString(), attempts: row.attempts + 1 })
      .eq("id", row.id);
    // Rewrite external plati.market links to this product into internal links
    // across every other card that already references it.
    try {
      await refreshBacklinksFor(row.digiseller_id, db);
    } catch (e) {
      console.error("[sync] refresh backlinks failed", e);
    }
    return { processed: true, digiseller_id: row.digiseller_id, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const nextAttempts = row.attempts + 1;
    await db
      .from("product_import_queue")
      .update({
        status: nextAttempts >= 5 ? "failed" : "pending",
        attempts: nextAttempts,
        last_error: msg.slice(0, 500),
      })
      .eq("id", row.id);
    return { processed: true, digiseller_id: row.digiseller_id, ok: false, error: msg };
  }
}

function productImage(row: Row): string {
  return row.url_image || row.image || `https://graph.digiseller.ru/img.ashx?id_d=${row.id_goods}&w=400&h=300&crop=true`;
}

function sanitizeDigisellerHtml(raw: string): string {
  if (!raw) return "";
  let s = raw;
  // Convert <br>/<br /> to newlines
  s = s.replace(/<br\s*\/?\s*>/gi, "\n");
  // Convert </p>, </div>, </li> to newlines
  s = s.replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "• ");
  // Strip all remaining tags (including custom like <attention>)
  s = s.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  // Collapse whitespace
  s = s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function generateUniqueDescription(title: string, categoryName: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Ты SEO-копирайтер маркетплейса цифровых товаров. Пиши кратко (60–90 слов), уникально, по-русски, без воды и без markdown. Без обещаний \"лучший/дешевле всех\". Конкретно: что покупатель получает, как активировать, на что обратить внимание.",
          },
          {
            role: "user",
            content: `Категория: ${categoryName}\nНазвание товара: ${title}\nНапиши уникальное описание.`,
          },
        ],
      }),
    });
    if (!res.ok) return "";
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return (json.choices?.[0]?.message?.content ?? "").trim();
  } catch {
    return "";
  }
}

function flattenCategories(nodes: CategoryNode[] | undefined, out: Array<{ id: number; name: string }> = []): typeof out {
  if (!nodes) return out;
  for (const n of nodes) {
    out.push({ id: n.id, name: n.name });
    if (n.sub?.length) flattenCategories(n.sub, out);
  }
  return out;
}

export async function runDailyImport(providedDb?: DB): Promise<{ imported: number; skipped: number; category: string }> {
  const db = await resolveDb(providedDb);
  const id_seller = Number(getSellerId());

  // 1. Get categories, upsert into DB and pick a random one with goods
  const cats = await digisellerPost<CategoriesResp>("/api/categories", { id_seller, lang: "ru-RU" });
  if (cats.retval !== 0) throw new Error(`categories retval=${cats.retval}`);
  const flat = flattenCategories(cats.category);
  if (flat.length === 0) throw new Error("no categories");

  // upsert categories
  await db.from("categories").upsert(
    flat.map((c, i) => ({
      slug: `cat-${c.id}`,
      name: c.name,
      sort_order: i,
      is_active: true,
    })),
    { onConflict: "slug" },
  );

  // 2. Pick random category & random page
  const target = pick(flat, 1)[0];
  const firstPage = await digisellerPost<SellerGoodsResp>(
    "/api/seller-goods",
    { id_seller, owner_id: target.id, order_col: "name", order_dir: "asc", rows: 200, page: 1, currency: "RUR", lang: "ru-RU", show_hidden: 0 },
    true,
  );
  if (firstPage.retval !== 0) throw new Error(`seller-goods retval=${firstPage.retval}`);
  const totalPages = Math.max(1, firstPage.total_pages ?? 1);
  const pageNum = totalPages === 1 ? 1 : Math.floor(Math.random() * totalPages) + 1;
  const page =
    pageNum === 1
      ? firstPage
      : await digisellerPost<SellerGoodsResp>(
          "/api/seller-goods",
          { id_seller, owner_id: target.id, order_col: "name", order_dir: "asc", rows: 200, page: pageNum, currency: "RUR", lang: "ru-RU", show_hidden: 0 },
          true,
        );
  const allRows = page.rows ?? page.product ?? [];

  // 3. Skip rows already imported
  const ids = allRows.map((r) => String(r.id_goods));
  const { data: existing } = await db
    .from("products")
    .select("digiseller_id")
    .in("digiseller_id", ids);
  const existingIds = new Set((existing ?? []).map((e: { digiseller_id: string | null }) => e.digiseller_id));
  const fresh = allRows.filter((r) => !existingIds.has(String(r.id_goods)));

  // 4. Pick random 25-40
  const count = Math.min(fresh.length, 25 + Math.floor(Math.random() * 16));
  const chosen = pick(fresh, count);

  // 5. For each — generate unique description & upsert
  let imported = 0;
  for (const row of chosen) {
    const description = await generateUniqueDescription(row.name, target.name);
    const price = Math.round(Number(row.price_rur ?? row.price ?? 0));
    const slug = `digi-${row.id_goods}`;
    const { error } = await db.from("products").upsert(
      {
        slug,
        title: row.name,
        category_slug: `cat-${target.id}`,
        digiseller_category_id: String(target.id),
        seller: "plati.market",
        seller_rating: 5,
        price,
        old_price: null,
        rating: 5,
        reviews: row.cnt_comment ?? 0,
        sales: row.cnt_sell ?? 0,
        image: productImage(row),
        badge: row.has_discount ? "-%" : null,
        description,
        details_url: productUrl(row.id_goods),
        buy_url: productUrl(row.id_goods),
        digiseller_id: String(row.id_goods),
        is_active: true,
        in_stock: true,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );
    if (!error) imported++;
    if (!error) {
      try {
        const { data: row } = await db
          .from("products")
          .select("id,seo_locked")
          .eq("slug", slug)
          .maybeSingle();
        if (row && !row.seo_locked) {
          const { generateAndSaveSeoForProduct } = await import("@/lib/seo/ai-seo.server");
          await generateAndSaveSeoForProduct(row.id, undefined, db);
        }
      } catch (e) {
        console.error("[sync] daily import seo failed", e);
      }
    }
  }

  return { imported, skipped: allRows.length - chosen.length, category: target.name };
}

export async function importDigisellerProductById(
  digisellerId: string,
  categorySlug: string | null = null,
  providedDb?: DB,
): Promise<{ ok: true; slug: string; created: boolean }> {
  const db = await resolveDb(providedDb);

  const json = await digisellerGet<ProductDataResp>(
    `/api/products/${encodeURIComponent(digisellerId)}/data?currency=RUR&lang=ru-RU`,
  );
  if (json.retval !== 0 || !json.product) {
    throw new Error(`Digiseller вернул ошибку retval=${json.retval} ${json.retdesc ?? ""}`);
  }
  const pd = json.product;
  const title = pd.name ?? `Товар ${digisellerId}`;
  const price = Math.round(Number(pd.prices_unit?.price_rub ?? pd.price?.price ?? 0));
  const image =
    pd.image ||
    `https://graph.digiseller.ru/img.ashx?id_d=${digisellerId}&w=400&h=300&crop=true`;
  const images = extractImages(pd);
  const videos = extractVideos(pd);
  const slug = `digi-${digisellerId}`;

  // Ensure category exists
  let catSlug = categorySlug && categorySlug.trim() ? categorySlug.trim() : "";
  if (!catSlug) {
    const platiCat = await fetchPlatiTopCategory(digisellerId);
    if (platiCat) {
      catSlug = platiCat.slug;
      await ensureCategoryRow(db, platiCat.slug, platiCat.name);
    } else {
      catSlug = "cat-imported";
      await ensureCategoryRow(db, "cat-imported", "Импорт");
    }
  } else {
    await ensureCategoryRow(db, catSlug, catSlug);
  }

  // Description: prefer the real product description from plati.market / Digiseller
  // (info = описание, add_info = инструкция/правила покупки). Fall back to an
  // AI-generated unique blurb only if Digiseller returned nothing.
  const info = sanitizeDigisellerHtml(pd.info ?? "");
  const addInfo = sanitizeDigisellerHtml(pd.add_info ?? "");
  let description = "";
  if (info) description += info;
  if (addInfo) {
    description += (description ? "\n\n" : "") + "Инструкция и правила покупки\n\n" + addInfo;
  }
  if (!description) description = await generateUniqueDescription(title, catSlug);

  // Enqueue any plati.market links we don't know yet, then rewrite known ones
  // to internal /product/<slug> URLs before saving.
  try {
    const linkedIds = extractPlatiItemIds(description).filter((x) => x !== digisellerId);
    if (linkedIds.length) await enqueuePlatiIds(db, linkedIds, null);
  } catch (e) {
    console.error("[sync] pre-save enqueue links failed", e);
  }
  description = await rewritePlatiLinksToInternal(description, db);

  // Look up existing row by digiseller_id (preferred) or slug to prevent duplicates.
  // If found, UPDATE in place (keep stable id/slug to preserve URLs and inbound links).
  // If not found, INSERT new.
  const { data: existingByDigi } = await db
    .from("products")
    .select("id, slug")
    .eq("digiseller_id", digisellerId)
    .maybeSingle();
  const { data: existingBySlug } = existingByDigi
    ? { data: null as { id: string; slug: string } | null }
    : await db
        .from("products")
        .select("id, slug")
        .eq("slug", slug)
        .maybeSingle();
  const existing = existingByDigi ?? existingBySlug;

  const inStock = pd.in_stock === undefined ? true : Boolean(pd.in_stock);

  const stats = computeSellerStats(pd);

  const payload = {
      slug: existing?.slug ?? slug,
      title,
      category_slug: catSlug,
      seller: stats.sellerName,
      seller_rating: stats.rating,
      price,
      old_price: null,
      rating: stats.rating,
      reviews: stats.reviews,
      sales: stats.sales,
      image,
      images,
      videos,
      badge: null,
      description,
      details_url: productUrl(Number(digisellerId)),
      buy_url: productUrl(Number(digisellerId)),
      digiseller_id: digisellerId,
      is_active: true,
      in_stock: inStock,
      last_synced_at: new Date().toISOString(),
    };

  if (existing) {
    const { error } = await db
      .from("products")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("products").insert(payload);
    if (error) throw new Error(error.message);
  }

  // If the resolved category has no cover image yet, use this product's image
  // so new auto-created categories aren't blank on the home grid.
  await ensureCategoryImage(db, catSlug, image);

  // Generate SEO in background (don't block import on AI latency/errors)
  try {
    const { data: row } = await db
      .from("products")
      .select("id,seo_locked")
      .eq("digiseller_id", digisellerId)
      .maybeSingle();
    if (row && !row.seo_locked) {
      const { generateAndSaveSeoForProduct } = await import("@/lib/seo/ai-seo.server");
      await generateAndSaveSeoForProduct(row.id, undefined, db);
    }
    // Re-write any external plati.market links pointing to THIS product in
    // other cards' descriptions to internal links now that the row exists.
    try {
      await refreshBacklinksFor(digisellerId, db);
    } catch (e) {
      console.error("[sync] refresh backlinks failed", e);
    }
  } catch (e) {
    console.error("[sync] seo gen after import failed", e);
  }

  return { ok: true, slug, created: !existing };
}

export async function runDailySync(limit = 100, providedDb?: DB): Promise<{ updated: number; deactivated: number; checked: number }> {
  const db = await resolveDb(providedDb);

  // Oldest synced first (NULLS FIRST), limited batch
  const { data: rows } = await db
    .from("products")
    .select("id, slug, digiseller_id, category_slug")
    .not("digiseller_id", "is", null)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  let updated = 0;
  let deactivated = 0;
  let checked = 0;
  for (const p of rows ?? []) {
    if (!p.digiseller_id) continue;
    checked++;
    try {
      const json = await digisellerGet<ProductDataResp>(
        `/api/products/${encodeURIComponent(p.digiseller_id)}/data?currency=RUR&lang=ru-RU`,
      );
      if (json.retval !== 0 || !json.product) {
        await db
          .from("products")
          .update({ is_active: false, in_stock: false, last_synced_at: new Date().toISOString() })
          .eq("id", p.id);
        deactivated++;
        continue;
      }
      const pd = json.product;
      const newPrice = Math.round(Number(pd.prices_unit?.price_rub ?? pd.price?.price ?? 0));
      const inStock = pd.in_stock === undefined ? true : Boolean(pd.in_stock);
      const patch: ProductUpdate = {
        last_synced_at: new Date().toISOString(),
        in_stock: inStock,
      };
      if (pd.name) patch.title = pd.name;
      if (newPrice > 0) patch.price = newPrice;
      const stats = computeSellerStats(pd);
      patch.sales = stats.sales;
      patch.reviews = stats.reviews;
      patch.rating = stats.rating;
      patch.seller = stats.sellerName;
      patch.seller_rating = stats.rating;
      const info = sanitizeDigisellerHtml(pd.info ?? "");
      const addInfo = sanitizeDigisellerHtml(pd.add_info ?? "");
      let desc = "";
      if (info) desc += info;
      if (addInfo) desc += (desc ? "\n\n" : "") + "Инструкция и правила покупки\n\n" + addInfo;
      if (desc) patch.description = desc;
      // Enqueue unknown linked items, rewrite known ones inline.
      try {
        const linkedIds = extractPlatiItemIds(desc).filter((x) => x !== p.digiseller_id);
        if (linkedIds.length) await enqueuePlatiIds(db, linkedIds, p.id);
      } catch (e) {
        console.error("[sync] enqueue plati links failed", e);
      }
      if (patch.description) {
        patch.description = await rewritePlatiLinksToInternal(patch.description, db);
      }
      const imgs = extractImages(pd);
      const vids = extractVideos(pd);
      patch.images = imgs;
      patch.videos = vids;
      if (pd.image) patch.image = pd.image;
      // If this product was dumped into the catch-all "Импорт" category,
      // try to re-resolve its real category from plati.market.
      if (p.category_slug === "cat-imported") {
        const platiCat = await fetchPlatiTopCategory(p.digiseller_id);
        if (platiCat) {
          await ensureCategoryRow(db, platiCat.slug, platiCat.name);
          patch.category_slug = platiCat.slug;
        }
      }
      const { error } = await db.from("products").update(patch).eq("id", p.id);
      if (!error) updated++;
      // SEO regen if not locked
      try {
        const { data: cur } = await db
          .from("products")
          .select("seo_locked")
          .eq("id", p.id)
          .maybeSingle();
        if (cur && !cur.seo_locked) {
          const { generateAndSaveSeoForProduct } = await import("@/lib/seo/ai-seo.server");
          await generateAndSaveSeoForProduct(p.id, undefined, db);
        }
      } catch (e) {
        console.error("[sync] seo regen failed", e);
      }
    } catch (e) {
      console.error("sync failed for", p.digiseller_id, e);
    }
  }
  return { updated, deactivated, checked };
}