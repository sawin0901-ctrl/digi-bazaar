import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/digiseller-sync")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { runDailySync } = await import("@/lib/digiseller/sync.server");
          const result = await runDailySync(100);
          return Response.json({ ok: true, ...result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("digiseller-sync failed:", msg);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});