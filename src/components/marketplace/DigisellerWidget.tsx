import { useEffect, useRef, useState } from "react";
import { ensureDigisellerScript, invokeDigiseller } from "@/lib/digiseller/loader";
import { Skeleton } from "@/components/ui/skeleton";

interface DigisellerWidgetProps {
  productId: string;
  agentId: string;
  sellerId: string;
  compact?: boolean;
}

const RENDER_TIMEOUT = 8000;
// Selectors that indicate the Digiseller standalone widget has actually
// painted something inside our container. The script never adds
// `.digiseller-buy`, so we look for any of the standalone markers.
const READY_SELECTORS = [
  ".digiseller-standalone-pay",
  ".digiseller-standalone-img",
  ".digiseller-standalone-description",
  ".digiseller-price-val",
  ".digiseller-cart-btn",
  ".digiseller-button",
].join(",");

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

    let observer: MutationObserver | null = null;

    const markReady = () => {
      if (cancelled) return;
      setStatus("ready");
      if (pollTimer != null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (timeoutTimer != null) {
        window.clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    const checkRendered = (el: HTMLElement) => !!el.querySelector(READY_SELECTORS);

    const start = async () => {
      try {
        await ensureDigisellerScript(sellerId);
        if (cancelled) return;

        const el = containerRef.current;
        if (!el) return;

        // Watch container for any rendered Digiseller markup.
        observer = new MutationObserver(() => {
          if (checkRendered(el)) markReady();
        });
        observer.observe(el, { childList: true, subtree: true });

        let tries = 0;
        const tryInvoke = () => {
          if (cancelled) return true;
          const invoked = invokeDigiseller(el);
          if (checkRendered(el)) {
            markReady();
            return true;
          }
          return invoked && tries > 4; // give DOM a few frames after first invoke
        };
        if (tryInvoke()) return;
        pollTimer = window.setInterval(() => {
          tries += 1;
          if (checkRendered(el)) {
            markReady();
            return;
          }
          invokeDigiseller(el);
          if (tries > 40 && pollTimer != null) {
            window.clearInterval(pollTimer);
            pollTimer = null;
          }
        }, 250);

        timeoutTimer = window.setTimeout(() => {
          if (cancelled) return;
          if (checkRendered(el)) {
            markReady();
            return;
          }
          if (pollTimer != null) {
            window.clearInterval(pollTimer);
            pollTimer = null;
          }
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
      if (observer) observer.disconnect();
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
