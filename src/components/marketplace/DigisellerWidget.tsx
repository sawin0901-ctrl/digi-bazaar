import { useEffect, useRef } from "react";

const SCRIPT_ID = "digiseller-js";
const CSS_ID = "digiseller-css";

function ensureScriptLoaded(sellerId: string) {
  if (typeof document === "undefined") return;

  // CSS
  if (!document.getElementById(CSS_ID)) {
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.id = CSS_ID;
    link.href = `//shop.digiseller.com/xml/store2_css.asp?seller_id=${sellerId}`;
    const head = document.getElementsByTagName("head")[0] || document.documentElement;
    head.appendChild(link);
  }

  // JS
  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script");
    script.async = true;
    script.id = SCRIPT_ID;
    script.src = `//digiseller.com/store2/digiseller-api.js.asp?seller_id=${sellerId}`;
    const head = document.getElementsByTagName("head")[0] || document.documentElement;
    head.appendChild(script);
  }
}

interface DigisellerWidgetProps {
  productId: string;
  agentId: string;
  sellerId: string;
  imgSize?: number;
  showName?: boolean;
  showPrice?: boolean;
}

export function DigisellerWidget({
  productId,
  agentId,
  sellerId,
  imgSize = 180,
  showName = true,
  showPrice = true,
}: DigisellerWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureScriptLoaded(sellerId);
  }, [sellerId]);

  useEffect(() => {
    // Try to re-initialize if the Digiseller API is already loaded
    const w = window as unknown as Record<string, unknown>;
    if (typeof w.DigiSeller === "function" && containerRef.current) {
      try {
        (w.DigiSeller as (container?: HTMLElement) => void)(containerRef.current);
      } catch {
        /* ignore */
      }
    }
  }, [productId, agentId]);

  return (
    <div ref={containerRef} style={{ display: "inline-block" }}>
      <div
        className="digiseller-buy-standalone"
        data-id={productId}
        data-ai={agentId}
        data-img="1"
        data-img-size={imgSize}
        data-name={showName ? "1" : "0"}
        data-price={showPrice ? "1" : "0"}
        data-no-price="0"
      />
    </div>
  );
}
