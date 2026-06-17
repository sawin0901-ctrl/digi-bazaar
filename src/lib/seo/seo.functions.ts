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

export type AdminSeoRow = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_h1: string | null;
  seo_keywords: string | null;
  seo_slug: string | null;
  seo_score: number;
  seo_locked: boolean;
  seo_generated_at: string | null;
};

export const adminListSeo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminSeoRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("products")
      .select("id,slug,title,seo_title,seo_description,seo_h1,seo_keywords,seo_slug,seo_score,seo_locked,seo_generated_at")
      .order("seo_generated_at", { ascending: true, nullsFirst: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetSeo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("products")
      .select(
        "id,slug,title,seo_title,seo_description,seo_keywords,seo_h1,seo_slug,short_description,full_description,advantages,instructions,faq,features,keywords_grouped,image_meta,seo_locked,seo_score,seo_generated_at",
      )
      .eq("id", data.productId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminRegenerateSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { generateAndSaveSeoForProduct } = await import("@/lib/seo/ai-seo.server");
    return await generateAndSaveSeoForProduct(data.productId, { force: true });
  });

export const adminUpdateSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      productId: string;
      seo_title?: string;
      seo_description?: string;
      seo_keywords?: string;
      seo_h1?: string;
      short_description?: string;
      full_description?: string;
      instructions?: string;
      advantages?: string[];
      features?: string[];
      faq?: { question: string; answer: string }[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { productId, ...patch } = data;
    const { error } = await context.supabase.from("products").update(patch).eq("id", productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleSeoLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; locked: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("products")
      .update({ seo_locked: data.locked })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBulkRegenerateSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const limit = Math.min(50, Math.max(1, data.limit ?? 20));
    const { data: rows, error } = await context.supabase
      .from("products")
      .select("id")
      .eq("seo_locked", false)
      .order("seo_generated_at", { ascending: true, nullsFirst: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    const { generateAndSaveSeoForProduct } = await import("@/lib/seo/ai-seo.server");
    let ok = 0;
    let fail = 0;
    for (const r of rows ?? []) {
      const res = await generateAndSaveSeoForProduct(r.id);
      if (res.ok) ok++; else fail++;
    }
    return { processed: rows?.length ?? 0, ok, fail };
  });