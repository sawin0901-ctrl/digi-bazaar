import { useEffect, useRef } from "react";

const SCRIPT_ID = "digiseller-js";
const CSS_ID = "digiseller-css";

function ensureScriptLoaded(sellerId: string) {
  if (typeof document === "undefined") return;

  if (!document.getElementById(CSS_ID)) {
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.id = CSS_ID;
    link.href = `//shop.digiseller.com/xml/store2_css.asp?seller_id=${sellerId}`;
    const head = document.getElementsByTagName("head")[0] || document.documentElement;
    head.appendChild(link);
  }

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
  compact?: boolean;
}

export function DigisellerWidget({
  productId,
  agentId,
  sellerId,
  compact = false,
}: DigisellerWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureScriptLoaded(sellerId);
  }, [sellerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as Record<string, unknown>;
    if (typeof w.DigiSeller === "function" && containerRef.current) {
      try {
        (w.DigiSeller as (container?: HTMLElement) => void)(containerRef.current);
      } catch {
        /* ignore */
      }
    }
  }, [productId, agentId]);

  const nameAttr = compact ? "0" : "1";
  const priceAttr = compact ? "0" : "1";
  const html = `<div style="display: inline-block;" class="digiseller-buy-standalone" data-id="${productId}" data-ai="${agentId}" data-img="0" data-img-size="" data-name="${nameAttr}" data-price="${priceAttr}" data-no-price="0"></div>`;

  return (
    <div ref={containerRef} className="digiseller-embed w-full">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
