import { digisellerPost, digisellerGet, getSellerId } from "./api.server";
import type { Database } from "@/integrations/supabase/types";
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

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
  };
};

function productUrl(id: number): string {
  return `https://plati.market/itm/${id}?ai=${AGENT_ID}`;
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

export async function runDailyImport(): Promise<{ imported: number; skipped: number; category: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const id_seller = Number(getSellerId());

  // 1. Get categories, upsert into DB and pick a random one with goods
  const cats = await digisellerPost<CategoriesResp>("/api/categories", { id_seller, lang: "ru-RU" });
  if (cats.retval !== 0) throw new Error(`categories retval=${cats.retval}`);
  const flat = flattenCategories(cats.category);
  if (flat.length === 0) throw new Error("no categories");

  // upsert categories
  await supabaseAdmin.from("categories").upsert(
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
  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("digiseller_id")
    .in("digiseller_id", ids);
  const existingIds = new Set((existing ?? []).map((e) => e.digiseller_id));
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
    const { error } = await supabaseAdmin.from("products").upsert(
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
  }

  return { imported, skipped: allRows.length - chosen.length, category: target.name };
}

export async function importDigisellerProductById(
  digisellerId: string,
  categorySlug: string | null = null,
): Promise<{ ok: true; slug: string; created: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
  const slug = `digi-${digisellerId}`;

  // Ensure category exists
  const catSlug = categorySlug && categorySlug.trim() ? categorySlug.trim() : "cat-imported";
  await supabaseAdmin
    .from("categories")
    .upsert(
      [{ slug: catSlug, name: catSlug === "cat-imported" ? "Импорт" : catSlug, is_active: true }],
      { onConflict: "slug" },
    );

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

  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const inStock = pd.in_stock === undefined ? true : Boolean(pd.in_stock);

  const { error } = await supabaseAdmin.from("products").upsert(
    {
      slug,
      title,
      category_slug: catSlug,
      seller: "plati.market",
      seller_rating: 5,
      price,
      old_price: null,
      rating: 5,
      reviews: 0,
      sales: pd.cnt_sell ?? 0,
      image,
      badge: null,
      description,
      details_url: productUrl(Number(digisellerId)),
      buy_url: productUrl(Number(digisellerId)),
      digiseller_id: digisellerId,
      is_active: true,
      in_stock: inStock,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );
  if (error) throw new Error(error.message);

  return { ok: true, slug, created: !existing };
}

export async function runDailySync(limit = 100): Promise<{ updated: number; deactivated: number; checked: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Oldest synced first (NULLS FIRST), limited batch
  const { data: rows } = await supabaseAdmin
    .from("products")
    .select("id, slug, digiseller_id")
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
        await supabaseAdmin
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
      if (typeof pd.cnt_sell === "number") patch.sales = pd.cnt_sell;
      const info = sanitizeDigisellerHtml(pd.info ?? "");
      const addInfo = sanitizeDigisellerHtml(pd.add_info ?? "");
      let desc = "";
      if (info) desc += info;
      if (addInfo) desc += (desc ? "\n\n" : "") + "Инструкция и правила покупки\n\n" + addInfo;
      if (desc) patch.description = desc;
      const { error } = await supabaseAdmin.from("products").update(patch).eq("id", p.id);
      if (!error) updated++;
    } catch (e) {
      console.error("sync failed for", p.digiseller_id, e);
    }
  }
  return { updated, deactivated, checked };
}