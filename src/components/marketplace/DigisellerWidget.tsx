import { useEffect, useRef } from "react";

const SELLER_ID = "1022102";

function ensureDigisellerLoaded() {
  if (typeof document === "undefined") return;
  const head = document.head;

  if (!document.getElementById("digiseller-css")) {
    const link = document.createElement("link");
    link.id = "digiseller-css";
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = `//shop.digiseller.com/xml/store2_css.asp?seller_id=${SELLER_ID}`;
    head.appendChild(link);
  }

  if (!document.getElementById("digiseller-js")) {
    const match = (name: string) =>
      document.cookie.match(new RegExp("(?:^|; )digiseller-" + name + "=([^;]*)"));
    const lang = match("lang");
    const cart = match("cart_uid");
    const qs =
      (lang ? `&lang=${lang[1]}` : "") + (cart ? `&cart_uid=${cart[1]}` : "");
    const script = document.createElement("script");
    script.id = "digiseller-js";
    script.async = true;
    script.src = `//digiseller.com/store2/digiseller-api.js.asp?seller_id=${SELLER_ID}${qs}`;
    head.appendChild(script);
  }
}

type Props = {
  productId: string | number;
  showImage?: boolean;
  imageSize?: number;
  showName?: boolean;
  showPrice?: boolean;
  className?: string;
};

export function DigisellerWidget({
  productId,
  showImage = true,
  imageSize = 180,
  showName = true,
  showPrice = true,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureDigisellerLoaded();
  }, [productId]);

  return (
    <div
      ref={ref}
      className={`digiseller-buy-standalone ${className ?? ""}`}
      data-id={String(productId)}
      data-ai={SELLER_ID}
      data-img={showImage ? 1 : 0}
      data-img-size={imageSize}
      data-name={showName ? 1 : 0}
      data-price={showPrice ? 1 : 0}
      data-no-price={showPrice ? 0 : 1}
      style={{ display: "inline-block" }}
    />
  );
}