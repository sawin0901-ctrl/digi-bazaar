import { useEffect, useRef, useState } from "react";
import { ensureDigisellerScript, invokeDigiseller } from "@/lib/digiseller/loader";

const SELLER_ID = "1459731";
const PARTNER_ID = "1459731";
const CACHE_PREFIX = "digi-price:";
const CACHE_TTL = 1000 * 60 * 30; // 30 min
const LOAD_TIMEOUT = 5000;
const LOG = "[digiseller:price]";

type CachedPrice = { value: string; currency: string; t: number };

function readCache(productId: string): CachedPrice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + productId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPrice;
    return parsed && parsed.value ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(productId: string, value: string, currency: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_PREFIX + productId,
      JSON.stringify({ value, currency, t: Date.now() }),
    );
  } catch {
    /* ignore quota */
  }
}

export function DigisellerPrice({ productId, fallback }: { productId: string; fallback: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const cached = typeof window !== "undefined" ? readCache(productId) : null;
  const [price, setPrice] = useState<{ value: string; currency: string } | null>(cached);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let observer: MutationObserver | null = null;
    let invokeTimer: number | null = null;
    let timeoutTimer: number | null = null;
    const t0 = performance.now();
    // eslint-disable-next-line no-console
    console.log(LOG, "mount", { productId, sellerId: SELLER_ID, hasCache: !!cached });

    const read = (): boolean => {
      const valEl = el.querySelector(".digiseller-price-val");
      if (!valEl) return false;
      const currencyEl = valEl.querySelector(".digiseller-money_current");
      const currency = currencyEl?.textContent?.trim() || "RUB";
      let text = "";
      valEl.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) text += n.textContent || "";
      });
      const num = text.replace(/[^\d]/g, "");
      if (num && !cancelled) {
        // eslint-disable-next-line no-console
        console.log(LOG, "price read", { productId, num, currency, elapsedMs: Math.round(performance.now() - t0) });
        setPrice({ value: num, currency });
        writeCache(productId, num, currency);
        return true;
      }
      return false;
    };

    // Defer to idle so widget never blocks first paint.
    const start = () => {
      if (cancelled) return;
      ensureDigisellerScript(SELLER_ID).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn(LOG, "script load failed — using fallback price", { productId, err: String(err) });
      });

      let invokeTries = 0;
      invokeTimer = window.setInterval(() => {
        invokeTries += 1;
        if (invokeDigiseller(el) || invokeTries > 40) {
          if (invokeTimer != null) window.clearInterval(invokeTimer);
          invokeTimer = null;
        }
      }, 250);

      if (read()) return;
      observer = new MutationObserver(() => {
        if (read() && observer) observer.disconnect();
      });
      observer.observe(el, { childList: true, subtree: true, characterData: true });

      timeoutTimer = window.setTimeout(() => {
        // Stop waiting; UI already has a fallback price.
        if (observer) observer.disconnect();
        if (invokeTimer != null) window.clearInterval(invokeTimer);
        // eslint-disable-next-line no-console
        console.warn(LOG, "timeout — staying on fallback", {
          productId,
          gotPrice: !!price,
          elapsedMs: Math.round(performance.now() - t0),
          digiSellerGlobal: typeof (window as unknown as { DigiSeller?: unknown }).DigiSeller,
        });
      }, LOAD_TIMEOUT);
    };

    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
    }).requestIdleCallback;
    const handle = ric
      ? ric(start, { timeout: 1500 })
      : window.setTimeout(start, 0);

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (invokeTimer != null) window.clearInterval(invokeTimer);
      if (timeoutTimer != null) window.clearTimeout(timeoutTimer);
      if (ric) {
        const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
        cic?.(handle as number);
      } else {
        window.clearTimeout(handle as number);
      }
    };
  }, [productId]);

  const display = price
    ? `${Number(price.value).toLocaleString("ru-RU")} ${price.currency === "RUB" ? "₽" : price.currency}`
    : `${fallback.toLocaleString("ru-RU")} ₽`;

  return (
    <>
      <div className="text-xl font-bold tracking-tight">{display}</div>
      <div
        ref={ref}
        aria-hidden="true"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", pointerEvents: "none", opacity: 0 }}
        dangerouslySetInnerHTML={{
          __html: `<div class="digiseller-buy-standalone" data-id="${productId}" data-ai="${PARTNER_ID}" data-img="0" data-img-size="" data-name="0" data-price="1" data-no-price="0"></div>`,
        }}
      />
    </>
  );
}