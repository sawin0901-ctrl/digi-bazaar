import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/digiseller-availability")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { runFullAvailabilityCheck } = await import(
            "@/lib/digiseller/availability.server"
          );
          const result = await runFullAvailabilityCheck();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("digiseller-availability failed:", msg);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});