import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticPaths = ["/", "/catalog", "/deals", "/reviews", "/faq", "/contact"];
        const entries: Array<{ path: string; lastmod?: string }> = staticPaths.map((p) => ({
          path: p,
        }));

        try {
          const sb = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          // Only active (non-hidden) products are included.
          const { data: products } = await sb
            .from("products")
            .select("slug, updated_at")
            .eq("is_active", true)
            .order("updated_at", { ascending: false })
            .limit(5000);
          for (const p of products ?? []) {
            entries.push({ path: `/product/${p.slug}`, lastmod: p.updated_at ?? undefined });
          }
        } catch (e) {
          console.error("sitemap product fetch failed", e);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});