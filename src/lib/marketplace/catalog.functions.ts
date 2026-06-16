import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type CategoryDTO = {
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  sort_order: number;
};

export type ProductDTO = {
  slug: string;
  title: string;
  category_slug: string;
  seller: string;
  seller_rating: number;
  price: number;
  old_price: number | null;
  rating: number;
  reviews: number;
  sales: number;
  image: string;
  badge: string | null;
  description: string;
  details_url: string | null;
  buy_url: string | null;
  digiseller_id: string | null;
  variant_label: string | null;
};

export type VariantDTO = {
  label: string;
  usd_amount: number | null;
  price_rub: number | null;
  sort_order: number;
};

export type ProductWithVariants = ProductDTO & { variants: VariantDTO[] };

export type TextDTO = { slug: string; title: string; body: string };

export const listCategories = createServerFn({ method: "GET" }).handler(async (): Promise<CategoryDTO[]> => {
  const sb = publicSupabase();
  const { data, error } = await sb
    .from("categories")
    .select("slug,name,description,image,sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d: { category?: string; dealsOnly?: boolean } | undefined) => d ?? {})
  .handler(async ({ data }): Promise<ProductDTO[]> => {
    const sb = publicSupabase();
    let q = sb
      .from("products")
      .select(
        "slug,title,category_slug,seller,seller_rating,price,old_price,rating,reviews,sales,image,badge,description,details_url,buy_url,digiseller_id,variant_label",
      )
      .eq("is_active", true)
      .order("sort_order")
      .order("sales", { ascending: false });
    if (data.category) q = q.eq("category_slug", data.category);
    if (data.dealsOnly) q = q.not("old_price", "is", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<ProductWithVariants | null> => {
    const sb = publicSupabase();
    const { data: prow, error: pErr } = await sb
      .from("products")
      .select(
        "id,slug,title,category_slug,seller,seller_rating,price,old_price,rating,reviews,sales,image,badge,description,details_url,buy_url,digiseller_id,variant_label",
      )
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prow) return null;
    const { data: vrows, error: vErr } = await sb
      .from("product_variants")
      .select("label,usd_amount,price_rub,sort_order")
      .eq("product_id", prow.id)
      .eq("is_active", true)
      .order("sort_order");
    if (vErr) throw new Error(vErr.message);
    const { id: _omit, ...product } = prow;
    void _omit;
    return {
      ...product,
      variants: (vrows ?? []).map((v) => ({
        label: v.label,
        usd_amount: v.usd_amount === null ? null : Number(v.usd_amount),
        price_rub: v.price_rub,
        sort_order: v.sort_order,
      })),
    };
  });

export const getSiteText = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<TextDTO | null> => {
    const sb = publicSupabase();
    const { data: row, error } = await sb
      .from("site_texts")
      .select("slug,title,body")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const logClick = createServerFn({ method: "POST" })
  .inputValidator((d: { productSlug: string; variantLabel?: string | null; referer?: string | null }) => d)
  .handler(async ({ data }) => {
    const sb = publicSupabase();
    await sb.from("click_events").insert({
      product_slug: data.productSlug,
      variant_label: data.variantLabel ?? null,
      referer: data.referer ?? null,
    });
    return { ok: true };
  });