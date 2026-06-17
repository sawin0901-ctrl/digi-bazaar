import { useEffect, useRef, useState } from "react";
import { ensureDigisellerScript, invokeDigiseller } from "@/lib/digiseller/loader";
import { Skeleton } from "@/components/ui/skeleton";

interface DigisellerWidgetProps {
  productId: string;
  agentId: string;
  sellerId: string;
  compact?: boolean;
}

const RENDER_TIMEOUT = 5000;

export function DigisellerWidget({
  productId,
  agentId,
  sellerId,
  compact = false,
}: DigisellerWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | null = null;
    let timeoutTimer: number | null = null;
    setStatus("loading");

    const start = async () => {
      try {
        await ensureDigisellerScript(sellerId);
        if (cancelled) return;

        let tries = 0;
        const tryInvoke = () => {
          if (cancelled) return true;
          const el = containerRef.current;
          if (!el) return false;
          if (invokeDigiseller(el)) {
            // Consider it ready as soon as Digiseller starts populating DOM.
            const ready = !!el.querySelector(".digiseller-buy");
            if (ready) setStatus("ready");
            return ready;
          }
          return false;
        };
        if (tryInvoke()) return;
        pollTimer = window.setInterval(() => {
          tries += 1;
          if (tryInvoke() || tries > 40) {
            if (pollTimer != null) window.clearInterval(pollTimer);
            pollTimer = null;
            // Even if we never observed rendered markup, hide skeleton.
            if (!cancelled) setStatus("ready");
          }
        }, 250);

        timeoutTimer = window.setTimeout(() => {
          if (cancelled) return;
          if (pollTimer != null) window.clearInterval(pollTimer);
          setStatus((s) => (s === "ready" ? s : "error"));
        }, RENDER_TIMEOUT);
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    // Defer to idle so widget doesn't block first paint / hydration.
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
    }).requestIdleCallback;
    const handle = ric ? ric(() => void start(), { timeout: 1500 }) : window.setTimeout(() => void start(), 0);

    return () => {
      cancelled = true;
      if (pollTimer != null) window.clearInterval(pollTimer);
      if (timeoutTimer != null) window.clearTimeout(timeoutTimer);
      if (ric) {
        const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
        cic?.(handle as number);
      } else {
        window.clearTimeout(handle as number);
      }
    };
  }, [productId, agentId, sellerId]);

  const nameAttr = compact ? "0" : "1";
  const priceAttr = compact ? "0" : "1";
  const html = `<div style="display: inline-block;" class="digiseller-buy-standalone" data-id="${productId}" data-ai="${agentId}" data-img="0" data-img-size="" data-name="${nameAttr}" data-price="${priceAttr}" data-no-price="0"></div>`;

  return (
    <div className="digiseller-embed relative w-full">
      {status === "loading" && (
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      )}
      {status === "error" && (
        <div className="text-sm text-muted-foreground">
          Виджет покупки временно недоступен. Обновите страницу или попробуйте позже.
        </div>
      )}
      <div
        ref={containerRef}
        style={status === "ready" ? undefined : { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", opacity: 0, pointerEvents: "none" }}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
