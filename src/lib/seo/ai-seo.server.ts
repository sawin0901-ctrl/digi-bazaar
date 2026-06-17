import type { Database } from "@/integrations/supabase/types";

type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type SeoInput = {
  productId: string;
  title: string;
  categoryName?: string | null;
  rawDescription?: string | null;
  rawInstructions?: string | null;
  images?: string[];
  digisellerId?: string | null;
};

export type SeoBundle = {
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  seo_h1: string;
  seo_slug: string;
  short_description: string;
  full_description: string;
  advantages: string[];
  instructions: string;
  faq: { question: string; answer: string }[];
  features: string[];
  keywords_grouped: {
    high: string[];
    mid: string[];
    low: string[];
    lsi: string[];
    commercial: string[];
    informational: string[];
  };
  image_meta: { url: string; alt: string; title: string; caption: string }[];
};

function transliterate(s: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return s
    .toLowerCase()
    .split("")
    .map((c) => (map[c] !== undefined ? map[c] : c))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function scoreSeo(b: SeoBundle): number {
  let s = 0;
  const tlen = b.seo_title.length;
  if (tlen >= 30 && tlen <= 65) s += 20; else if (tlen > 10) s += 10;
  const dlen = b.seo_description.length;
  if (dlen >= 120 && dlen <= 170) s += 20; else if (dlen > 50) s += 10;
  if (b.seo_h1.length > 5) s += 10;
  if (b.seo_keywords.length > 10) s += 10;
  if (b.full_description.length > 200) s += 10;
  if (b.faq.length >= 3) s += 10;
  if (b.advantages.length >= 3) s += 10;
  if (b.image_meta.length > 0) s += 5;
  if (Object.values(b.keywords_grouped).some((a) => a.length > 0)) s += 5;
  return Math.min(100, s);
}

function safeString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function safeArrayStr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => safeString(x)).filter(Boolean);
}

export async function generateProductSeo(input: SeoInput): Promise<SeoBundle | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    console.warn("[ai-seo] LOVABLE_API_KEY not set");
    return null;
  }

  const stripped = (input.rawDescription ?? "").slice(0, 4000);
  const instr = (input.rawInstructions ?? "").slice(0, 2000);
  const imgs = (input.images ?? []).slice(0, 8);

  const userPrompt = `Сгенерируй уникальный SEO-контент для карточки цифрового товара.

Категория: ${input.categoryName ?? "Цифровые товары"}
Название товара: ${input.title}
ID товара: ${input.productId}
${stripped ? `\nИсходное описание поставщика (как сырьё, НЕ копируй дословно):\n${stripped}` : ""}
${instr ? `\nИсходная инструкция:\n${instr}` : ""}
${imgs.length ? `\nИзображения товара:\n${imgs.map((u, i) => `${i + 1}. ${u}`).join("\n")}` : ""}

Верни СТРОГО валидный JSON одним объектом со следующими полями (без markdown, без \`\`\`):
{
  "seo_title": "30-65 символов, с ключом и брендом",
  "seo_description": "120-170 символов, естественный, призыв к действию",
  "seo_keywords": "8-15 ключей через запятую",
  "seo_h1": "цепляющий H1, отличается от seo_title",
  "seo_slug": "латиница-через-дефис, до 80 символов",
  "short_description": "1-2 предложения, что покупатель получает",
  "full_description": "200-450 слов, естественный язык, абзацы через \\n\\n, без воды и без markdown",
  "advantages": ["6-8 преимуществ", "..."],
  "instructions": "пошаговая инструкция активации, абзацы через \\n",
  "faq": [{"question": "?", "answer": "..."}, ... 5-7 пар],
  "features": ["4-6 особенностей товара"],
  "keywords_grouped": {
    "high": ["высокочастотные 3-5"],
    "mid": ["среднечастотные 5-8"],
    "low": ["низкочастотные/длинный хвост 5-10"],
    "lsi": ["LSI ключи 5-8"],
    "commercial": ["купить ${input.title.toLowerCase()}", "..."],
    "informational": ["как активировать", "..."]
  },
  "image_meta": ${imgs.length ? "[ объекты для КАЖДОГО url выше: {url, alt (до 120 симв), title (до 70), caption (до 160)} ]" : "[]"}
}

Требования: уникальность, естественный русский язык, без переспама, без обещаний «лучший/дешевле всех», конкретика что получает покупатель. Каждое поле обязательно.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Ты опытный SEO-копирайтер маркетплейса цифровых товаров. Пишешь уникальные тексты на русском. Отвечаешь ТОЛЬКО валидным JSON без обрамления.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      console.warn("[ai-seo] gateway", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    if (!raw) return null;
    // Strip code fences if model added them
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) return null;
      parsed = JSON.parse(m[0]);
    }

    const bundle: SeoBundle = {
      seo_title: safeString(parsed.seo_title) || input.title,
      seo_description: safeString(parsed.seo_description),
      seo_keywords: safeString(parsed.seo_keywords),
      seo_h1: safeString(parsed.seo_h1) || input.title,
      seo_slug: safeString(parsed.seo_slug) || transliterate(input.title),
      short_description: safeString(parsed.short_description),
      full_description: safeString(parsed.full_description),
      advantages: safeArrayStr(parsed.advantages),
      instructions: safeString(parsed.instructions),
      faq: Array.isArray(parsed.faq)
        ? (parsed.faq as unknown[])
            .map((x) => {
              if (!x || typeof x !== "object") return null;
              const o = x as Record<string, unknown>;
              const q = safeString(o.question);
              const a = safeString(o.answer);
              return q && a ? { question: q, answer: a } : null;
            })
            .filter((x): x is { question: string; answer: string } => x !== null)
        : [],
      features: safeArrayStr(parsed.features),
      keywords_grouped: {
        high: safeArrayStr((parsed.keywords_grouped as Record<string, unknown> | undefined)?.high),
        mid: safeArrayStr((parsed.keywords_grouped as Record<string, unknown> | undefined)?.mid),
        low: safeArrayStr((parsed.keywords_grouped as Record<string, unknown> | undefined)?.low),
        lsi: safeArrayStr((parsed.keywords_grouped as Record<string, unknown> | undefined)?.lsi),
        commercial: safeArrayStr((parsed.keywords_grouped as Record<string, unknown> | undefined)?.commercial),
        informational: safeArrayStr((parsed.keywords_grouped as Record<string, unknown> | undefined)?.informational),
      },
      image_meta: Array.isArray(parsed.image_meta)
        ? (parsed.image_meta as unknown[])
            .map((x) => {
              if (!x || typeof x !== "object") return null;
              const o = x as Record<string, unknown>;
              const url = safeString(o.url);
              if (!url) return null;
              return {
                url,
                alt: safeString(o.alt) || input.title,
                title: safeString(o.title) || input.title,
                caption: safeString(o.caption),
              };
            })
            .filter((x): x is { url: string; alt: string; title: string; caption: string } => x !== null)
        : [],
    };
    return bundle;
  } catch (e) {
    console.error("[ai-seo] failed", e);
    return null;
  }
}

export function seoBundleToProductPatch(b: SeoBundle): ProductUpdate {
  return {
    seo_title: b.seo_title,
    seo_description: b.seo_description,
    seo_keywords: b.seo_keywords,
    seo_h1: b.seo_h1,
    seo_slug: b.seo_slug,
    short_description: b.short_description,
    full_description: b.full_description,
    advantages: b.advantages,
    instructions: b.instructions,
    faq: b.faq,
    features: b.features,
    keywords_grouped: b.keywords_grouped,
    image_meta: b.image_meta,
    seo_score: scoreSeo(b),
    seo_generated_at: new Date().toISOString(),
  };
}

/**
 * Generate SEO for a product by id and persist it, unless seo_locked = true.
 * Errors are swallowed and logged — never throw from this helper, callers
 * (import/sync) must continue.
 */
export async function generateAndSaveSeoForProduct(productId: string, opts?: { force?: boolean }): Promise<{ ok: boolean; reason?: string }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .select("id,title,category_slug,description,instructions,images,digiseller_id,seo_locked")
      .eq("id", productId)
      .maybeSingle();
    if (error || !row) return { ok: false, reason: error?.message ?? "not found" };
    if (row.seo_locked && !opts?.force) return { ok: false, reason: "locked" };

    let categoryName: string | null = null;
    if (row.category_slug) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("name")
        .eq("slug", row.category_slug)
        .maybeSingle();
      categoryName = cat?.name ?? row.category_slug;
    }

    const bundle = await generateProductSeo({
      productId: row.id,
      title: row.title,
      categoryName,
      rawDescription: row.description ?? "",
      rawInstructions: row.instructions ?? "",
      images: Array.isArray(row.images) ? (row.images as string[]) : [],
      digisellerId: row.digiseller_id,
    });
    if (!bundle) return { ok: false, reason: "ai failed" };

    const patch = seoBundleToProductPatch(bundle);
    const { error: upErr } = await supabaseAdmin.from("products").update(patch).eq("id", row.id);
    if (upErr) return { ok: false, reason: upErr.message };
    return { ok: true };
  } catch (e) {
    console.error("[ai-seo] generateAndSaveSeoForProduct", e);
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}