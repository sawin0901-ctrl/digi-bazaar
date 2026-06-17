import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/process-import-queue")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { processOneFromImportQueue } = await import("@/lib/digiseller/sync.server");
          // Process up to 100 queued items per cron tick. Stops early when the
          // queue is empty. Each iteration is awaited sequentially to avoid
          // hammering plati.market / Digiseller in parallel.
          const MAX_PER_RUN = 100;
          let processed = 0;
          let ok = 0;
          let failed = 0;
          const errors: string[] = [];
          for (let i = 0; i < MAX_PER_RUN; i++) {
            const r = await processOneFromImportQueue();
            if (!r.processed) break;
            processed++;
            if (r.ok) ok++;
            else {
              failed++;
              if (r.error) errors.push(`${r.digiseller_id}: ${r.error}`);
            }
          }
          return Response.json({ ok: true, processed, succeeded: ok, failed, errors });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("process-import-queue failed:", msg);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});