import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/digiseller-import")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { runDailyImport } = await import("@/lib/digiseller/sync.server");
          const result = await runDailyImport();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("digiseller-import failed:", msg);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});