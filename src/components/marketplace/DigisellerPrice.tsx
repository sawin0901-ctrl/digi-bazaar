import { useEffect, useRef, useState } from "react";

const SCRIPT_ID = "digiseller-js";
const CSS_ID = "digiseller-css";
const SELLER_ID = "1459731";
const PARTNER_ID = "1459731";

function ensureScriptLoaded() {
  if (typeof document === "undefined") return;
  if (!document.getElementById(CSS_ID)) {
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.id = CSS_ID;
    link.href = `//shop.digiseller.com/xml/store2_css.asp?seller_id=${SELLER_ID}`;
    document.head.appendChild(link);
  }
  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script");
    script.async = true;
    script.id = SCRIPT_ID;
    script.src = `//digiseller.com/store2/digiseller-api.js.asp?seller_id=${SELLER_ID}`;
    document.head.appendChild(script);
  }
}

export function DigisellerPrice({ productId, fallback }: { productId: string; fallback: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [price, setPrice] = useState<{ value: string; currency: string } | null>(null);

  useEffect(() => {
    ensureScriptLoaded();
    const el = ref.current;
    if (!el) return;

    const read = () => {
      const valEl = el.querySelector(".digiseller-price-val");
      if (!valEl) return false;
      const currencyEl = valEl.querySelector(".digiseller-money_current");
      const currency = currencyEl?.textContent?.trim() || "RUB";
      // get the text node value (excluding currency block)
      let text = "";
      valEl.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) text += n.textContent || "";
      });
      const num = text.replace(/[^\d]/g, "");
      if (num) {
        setPrice({ value: num, currency });
        return true;
      }
      return false;
    };

    if (read()) return;
    const observer = new MutationObserver(() => {
      if (read()) observer.disconnect();
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
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