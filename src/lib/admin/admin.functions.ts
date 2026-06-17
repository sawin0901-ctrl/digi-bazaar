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

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { isAdmin: !!data, userId: context.userId };
  });

export type AdminProduct = {
  id: string;
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
  is_active: boolean;
  sort_order: number;
};

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminProduct[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("products")
      .select(
        "id,slug,title,category_slug,seller,seller_rating,price,old_price,rating,reviews,sales,image,badge,description,details_url,buy_url,digiseller_id,variant_label,is_active,sort_order",
      )
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export type ProductInput = {
  id?: string | null;
  slug: string;
  title: string;
  category_slug: string;
  seller: string;
  seller_rating: number;
  price: number;
  old_price?: number | null;
  rating: number;
  reviews: number;
  sales: number;
  image: string;
  badge?: string | null;
  description: string;
  digiseller_id?: string | null;
  variant_label?: string | null;
  is_active: boolean;
  sort_order: number;
};

function buildPartnerLinks(
  digisellerId: string | null | undefined,
  partnerAi: string,
): { details_url: string | null; buy_url: string | null } {
  if (!digisellerId) return { details_url: null, buy_url: null };
  return {
    details_url: `https://plati.market/itm/${digisellerId}?ai=${partnerAi}`,
    buy_url: `https://www.oplata.info/asp2/pay_wm.asp?id_d=${digisellerId}&ai=${partnerAi}&_ow=0`,
  };
}

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ProductInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: ai } = await context.supabase
      .from("site_settings")
      .select("value")
      .eq("key", "partner_ai")
      .maybeSingle();
    const partnerAi = ai?.value ?? "";
    const links = buildPartnerLinks(data.digiseller_id, partnerAi);
    const row = {
      slug: data.slug,
      title: data.title,
      category_slug: data.category_slug,
      seller: data.seller,
      seller_rating: data.seller_rating,
      price: data.price,
      old_price: data.old_price ?? null,
      rating: data.rating,
      reviews: data.reviews,
      sales: data.sales,
      image: data.image,
      badge: data.badge ?? null,
      description: data.description,
      digiseller_id: data.digiseller_id ?? null,
      variant_label: data.variant_label ?? null,
      is_active: data.is_active,
      sort_order: data.sort_order,
      ...links,
    };
    if (data.id) {
      const { error } = await context.supabase.from("products").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    } else {
      const { data: ins, error } = await context.supabase
        .from("products")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, id: ins.id };
    }
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListVariants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("product_variants")
      .select("id,label,usd_amount,price_rub,sort_order,is_active")
      .eq("product_id", data.productId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpsertVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string | null;
    product_id: string;
    label: string;
    usd_amount?: number | null;
    price_rub?: number | null;
    sort_order: number;
    is_active: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const row = {
      product_id: data.product_id,
      label: data.label,
      usd_amount: data.usd_amount ?? null,
      price_rub: data.price_rub ?? null,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("product_variants").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await context.supabase.from("product_variants").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("product_variants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("categories")
      .select("slug,name")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetSetting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("site_settings")
      .select("value")
      .eq("key", data.key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row?.value ?? "";
  });

export const adminSetSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: data.key, value: data.value });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminImportDigisellerProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { digisellerId: string; categorySlug?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const id = data.digisellerId.trim();
    if (!/^\d+$/.test(id)) throw new Error("Некорректный ID товара");

    const { importDigisellerProductById } = await import("@/lib/digiseller/sync.server");
    const result = await importDigisellerProductById(id, data.categorySlug ?? null);
    return result;
  });