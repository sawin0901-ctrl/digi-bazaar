/**
 * Plati.market link sanitizer + product quality evaluator.
 *
 * Pure functions — safe to import from any server module. No DB access here.
 */

const PLATI_URL_RE =
  /https?:\/\/(?:www\.)?plati\.market\/itm\/(?:[^\s"'<>)\]]+?\/)?(\d{4,})(?:\?[^\s"'<>)\]]*)?/gi;
const PLATI_ANY_RE = /https?:\/\/(?:www\.)?plati\.market[^\s"'<>)\]]*/gi;
const INTERNAL_HOST = "https://gameplaza.site";

export type SlugMap = Map<string, string>; // digiseller_id → product slug

/** Replace plati.market URLs in arbitrary text.
 *  - Known ids → absolute internal URL (https://gameplaza.site/product/<slug>)
 *  - Unknown ids → temporary marker `[[PLATI:<id>]]` so a later pass can rewrite
 *  - URLs without recognizable id → stripped (leave anchor text intact)
 */
export function sanitizePlatiText(text: string | null | undefined, slugMap: SlugMap): string {
  if (!text) return text ?? "";
  let out = text.replace(PLATI_URL_RE, (_full, id: string) => {
    const slug = slugMap.get(id);
    if (slug) return `${INTERNAL_HOST}/product/${slug}`;
    return `[[PLATI:${id}]]`;
  });
  // strip leftover bare plati.market urls
  out = out.replace(PLATI_ANY_RE, "");
  return out;
}

/** Walk arbitrary JSON value and sanitize every string inside. */
export function sanitizePlatiValue<T>(value: T, slugMap: SlugMap): T {
  if (value == null) return value;
  if (typeof value === "string") return sanitizePlatiText(value, slugMap) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => sanitizePlatiValue(v, slugMap)) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizePlatiValue(v, slugMap);
    }
    return out as unknown as T;
  }
  return value;
}

/** Extract numeric ids from any text/JSON-able value. */
export function extractPlatiIdsDeep(value: unknown): string[] {
  const out = new Set<string>();
  const visit = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "string") {
      let m: RegExpExecArray | null;
      const re = new RegExp(PLATI_URL_RE.source, PLATI_URL_RE.flags);
      while ((m = re.exec(v)) !== null) out.add(m[1]);
      const markerRe = /\[\[PLATI:(\d+)\]\]/g;
      while ((m = markerRe.exec(v)) !== null) out.add(m[1]);
    } else if (Array.isArray(v)) {
      for (const x of v) visit(x);
    } else if (typeof v === "object") {
      for (const x of Object.values(v as Record<string, unknown>)) visit(x);
    }
  };
  visit(value);
  return [...out];
}

/** Resolve `[[PLATI:<id>]]` markers using a fresh slug map. */
export function resolvePlatiMarkers<T>(value: T, slugMap: SlugMap): T {
  if (value == null) return value;
  if (typeof value === "string") {
    return value.replace(/\[\[PLATI:(\d+)\]\]/g, (full, id: string) => {
      const slug = slugMap.get(id);
      return slug ? `${INTERNAL_HOST}/product/${slug}` : full;
    }) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => resolvePlatiMarkers(v, slugMap)) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolvePlatiMarkers(v, slugMap);
    }
    return out as unknown as T;
  }
  return value;
}

/* ----------------------------------------------------------------- */
/* Quality evaluation                                                 */
/* ----------------------------------------------------------------- */

export type QualityInput = {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  price?: number | null;
  in_stock?: boolean | null;
};

export type QualityResult = { ok: boolean; issues: string[] };

const PLACEHOLDER_IMG_RE = /(placeholder|no[-_]?image|noimage|default|blank|stub|missing)/i;

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}

function stripLinks(s: string): string {
  return s.replace(/https?:\/\/\S+/g, " ");
}

export function evaluateProduct(p: QualityInput): QualityResult {
  const issues: string[] = [];

  // Image
  const img = (p.image ?? "").trim();
  if (!img) issues.push("missing_image");
  else if (PLACEHOLDER_IMG_RE.test(img)) issues.push("placeholder_image");
  else if (!/^https?:\/\//i.test(img)) issues.push("invalid_image_url");

  // Price
  const price = Number(p.price ?? 0);
  if (!Number.isFinite(price) || price <= 0) issues.push("missing_price");

  // Stock
  if (p.in_stock === false) issues.push("out_of_stock");

  // Title
  const title = (p.title ?? "").trim();
  if (title.length < 5) issues.push("missing_title");
  else {
    const wordChars = title.replace(/[^\p{L}]/gu, "");
    if (wordChars.length / Math.max(1, title.length) < 0.4) issues.push("garbled_title");
    if (!/[\p{L}]{3,}/u.test(title)) issues.push("garbled_title");
  }

  // Description
  const desc = stripLinks(stripHtml(p.description ?? "")).trim();
  if (desc.length < 100) issues.push("missing_description");
  else {
    const original = (p.description ?? "").length;
    const linkLen = original - desc.length;
    if (original > 0 && linkLen / original > 0.9) issues.push("description_links_only");
  }

  return { ok: issues.length === 0, issues };
}