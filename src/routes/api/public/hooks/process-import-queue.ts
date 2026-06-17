import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/process-import-queue")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { processOneFromImportQueue } = await import("@/lib/digiseller/sync.server");
          const result = await processOneFromImportQueue();
          return Response.json({ ok: true, ...result });
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