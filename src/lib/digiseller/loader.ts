// Async, retry-safe loader for the Digiseller embed script.
// - Single in-flight promise per seller_id
// - Timeout + exponential backoff retry
// - No-ops on the server (SSR-safe)

const SCRIPT_ID = "digiseller-js";
const CSS_ID = "digiseller-css";
const LOAD_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3;

type DigiSellerWin = Window & { DigiSeller?: (container?: HTMLElement) => void };

const inflight = new Map<string, Promise<void>>();

function getDigisellerCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )digiseller-" + name + "=([^;]*)"));
  return m ? m[1] : null;
}

function buildScriptSrc(sellerId: string): string {
  const lang = getDigisellerCookie("lang");
  const cart = getDigisellerCookie("cart_uid");
  const langParam = lang ? "&lang=" + lang : "";
  const cartParam = cart ? "&cart_uid=" + cart : "";
  return `//digiseller.com/store2/digiseller-api.js.asp?seller_id=${sellerId}${langParam}${cartParam}`;
}

function injectCss(sellerId: string) {
  if (document.getElementById(CSS_ID)) return;
  const link = document.createElement("link");
  link.type = "text/css";
  link.rel = "stylesheet";
  link.id = CSS_ID;
  link.href = `//shop.digiseller.com/xml/store2_css.asp?seller_id=${sellerId}`;
  document.head.appendChild(link);
}

function loadScriptOnce(sellerId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing && (window as DigiSellerWin).DigiSeller) {
      resolve();
      return;
    }
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.async = true;
      script.defer = true;
      script.id = SCRIPT_ID;
      script.src = buildScriptSrc(sellerId);
      document.head.appendChild(script);
    }
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("digiseller script timeout"));
    }, LOAD_TIMEOUT_MS);
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      script.remove();
      reject(new Error("digiseller script error"));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    // If script tag exists but DigiSeller global not yet ready, poll briefly.
    if (existing) {
      const poll = window.setInterval(() => {
        if ((window as DigiSellerWin).DigiSeller) {
          window.clearInterval(poll);
          cleanup();
          resolve();
        }
      }, 100);
      window.setTimeout(() => window.clearInterval(poll), LOAD_TIMEOUT_MS);
    }
  });
}

export function ensureDigisellerScript(sellerId: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }
  const key = sellerId;
  const cached = inflight.get(key);
  if (cached) return cached;

  injectCss(sellerId);

  const run = async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        await loadScriptOnce(sellerId);
        return;
      } catch (err) {
        lastErr = err;
        // exponential backoff: 300ms, 900ms
        const delay = 300 * Math.pow(3, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    inflight.delete(key); // allow future retries on next mount
    throw lastErr instanceof Error ? lastErr : new Error("digiseller load failed");
  };

  const p = run();
  inflight.set(key, p);
  return p;
}

export function invokeDigiseller(container: HTMLElement): boolean {
  if (typeof window === "undefined") return false;
  const fn = (window as DigiSellerWin).DigiSeller;
  if (typeof fn !== "function") return false;
  try {
    fn(container);
    return true;
  } catch {
    return false;
  }
}