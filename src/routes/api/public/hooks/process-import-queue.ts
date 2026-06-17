import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/process-import-queue")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { processOneFromImportQueue } = await import("@/lib/digiseller/sync.server");
          // Throttled batch: target ~200 new cards per 24h, spread evenly.
          // Cron fires every 20 min (72 ticks/day). Batch=3 caps the per-tick
          // load. A global daily cap (200) prevents burst catch-up after
          // outages. Each iteration is awaited + paused to avoid hammering
          // plati.market / Digiseller / our DB in parallel.
          const MAX_PER_RUN = 3;
          const DAILY_CAP = 200;
          const PAUSE_MS = 4000;

          // Count imports already done today (UTC day) and shrink the batch
          // to fit under the cap.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const since = new Date();
          since.setUTCHours(0, 0, 0, 0);
          const { count: doneToday } = await supabaseAdmin
            .from("product_import_queue")
            .select("id", { count: "exact", head: true })
            .eq("status", "done")
            .gte("processed_at", since.toISOString());
          const remaining = Math.max(0, DAILY_CAP - (doneToday ?? 0));
          const budget = Math.min(MAX_PER_RUN, remaining);
          if (budget <= 0) {
            return Response.json({
              ok: true,
              processed: 0,
              succeeded: 0,
              failed: 0,
              skipped: "daily cap reached",
              doneToday: doneToday ?? 0,
            });
          }

          let processed = 0;
          let ok = 0;
          let failed = 0;
          const errors: string[] = [];
          for (let i = 0; i < budget; i++) {
            const r = await processOneFromImportQueue();
            if (!r.processed) break;
            processed++;
            if (r.ok) ok++;
            else {
              failed++;
              if (r.error) errors.push(`${r.digiseller_id}: ${r.error}`);
            }
            // Pause between items to spread load on Digiseller + DB.
            if (i < budget - 1) await new Promise((res) => setTimeout(res, PAUSE_MS));
          }
          return Response.json({
            ok: true,
            processed,
            succeeded: ok,
            failed,
            errors,
            doneToday: (doneToday ?? 0) + ok,
            dailyCap: DAILY_CAP,
          });
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