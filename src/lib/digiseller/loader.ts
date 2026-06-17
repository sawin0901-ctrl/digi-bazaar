// Async, retry-safe loader for the Digiseller embed script.
// - Single in-flight promise per seller_id
// - Timeout + exponential backoff retry
// - No-ops on the server (SSR-safe)

const SCRIPT_ID = "digiseller-js";
const CSS_ID = "digiseller-css";
const LOAD_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3;
const LOG_PREFIX = "[digiseller]";

function log(...args: unknown[]) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.log(LOG_PREFIX, ...args);
}
function warn(...args: unknown[]) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.warn(LOG_PREFIX, ...args);
}
function error(...args: unknown[]) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.error(LOG_PREFIX, ...args);
}

type DigiSellerObject = {
  inited?: boolean;
  booted?: boolean;
  init?: () => unknown;
  boot?: () => unknown;
  $?: (el: HTMLElement) => unknown;
  widget?: { calc?: new (context: unknown) => unknown };
};
type DigiSellerWin = Window & { DigiSeller?: ((container?: HTMLElement) => void) | DigiSellerObject };

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
  return `https://digiseller.com/store2/digiseller-api.js.asp?seller_id=${sellerId}${langParam}${cartParam}`;
}

function hasDigisellerGlobal(): boolean {
  const digi = (window as DigiSellerWin).DigiSeller;
  return typeof digi === "function" || !!(digi && typeof digi === "object" && (typeof digi.boot === "function" || typeof digi.widget?.calc === "function"));
}

function injectCss(sellerId: string) {
  if (document.getElementById(CSS_ID)) return;
  const link = document.createElement("link");
  link.type = "text/css";
  link.rel = "stylesheet";
  link.id = CSS_ID;
  link.href = `https://shop.digiseller.com/xml/store2_css.asp?seller_id=${sellerId}`;
  document.head.appendChild(link);
}

function loadScriptOnce(sellerId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing && hasDigisellerGlobal()) {
      log("script already present, DigiSeller global ready", { sellerId });
      resolve();
      return;
    }
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.async = true;
      script.defer = true;
      script.id = SCRIPT_ID;
      script.src = buildScriptSrc(sellerId);
      log("injecting script", { sellerId, src: script.src });
      document.head.appendChild(script);
    } else {
      log("script tag exists, waiting for DigiSeller global", { sellerId });
    }
    const timer = window.setTimeout(() => {
      cleanup();
      error("script load timeout", { sellerId, ms: LOAD_TIMEOUT_MS });
      reject(new Error("digiseller script timeout"));
    }, LOAD_TIMEOUT_MS);
    const waitForGlobal = () => {
      if (hasDigisellerGlobal()) {
        cleanup();
        log("DigiSeller global ready", { sellerId, type: typeof (window as DigiSellerWin).DigiSeller });
        resolve();
        return;
      }
      const poll = window.setInterval(() => {
        if (!hasDigisellerGlobal()) return;
        window.clearInterval(poll);
        cleanup();
        log("DigiSeller global ready after poll", { sellerId, type: typeof (window as DigiSellerWin).DigiSeller });
        resolve();
      }, 100);
      window.setTimeout(() => window.clearInterval(poll), LOAD_TIMEOUT_MS);
    };
    const onLoad = () => {
      log("script onload", { sellerId, hasDigiSellerGlobal: hasDigisellerGlobal() });
      waitForGlobal();
    };
    const onError = () => {
      cleanup();
      script.remove();
      error("script onerror", { sellerId, src: script.src });
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
    if (existing) waitForGlobal();
  });
}

export function ensureDigisellerScript(sellerId: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }
  const key = sellerId;
  const cached = inflight.get(key);
  if (cached) {
    log("ensureDigisellerScript reusing in-flight load", { sellerId });
    return cached;
  }

  injectCss(sellerId);

  const run = async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      log("loadScriptOnce attempt", { sellerId, attempt: attempt + 1, of: MAX_ATTEMPTS });
      try {
        await loadScriptOnce(sellerId);
        return;
      } catch (err) {
        lastErr = err;
        warn("attempt failed", { sellerId, attempt: attempt + 1, err: String(err) });
        // exponential backoff: 300ms, 900ms
        const delay = 300 * Math.pow(3, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    inflight.delete(key); // allow future retries on next mount
    error("all attempts failed", { sellerId, lastErr: String(lastErr) });
    throw lastErr instanceof Error ? lastErr : new Error("digiseller load failed");
  };

  const p = run();
  inflight.set(key, p);
  return p;
}

export function invokeDigiseller(container: HTMLElement, options?: { silent?: boolean }): boolean {
  if (typeof window === "undefined") return false;
  const digi = (window as DigiSellerWin).DigiSeller;
  if (!digi) return false;
  try {
    if (typeof digi === "function") {
      digi(container);
      return true;
    }
    digi.boot?.();
    digi.init?.();
    const Calc = digi.widget?.calc;
    const $ = digi.$;
    if (typeof Calc !== "function" || typeof $ !== "function") return false;
    const targets = container.matches(".digiseller-buy-standalone")
      ? [container]
      : Array.from(container.querySelectorAll<HTMLElement>(".digiseller-buy-standalone"));
    let invoked = false;
    for (const target of targets) {
      if (target.childElementCount > 0 || target.dataset.gameplazaDigisellerInvoked === "1") {
        invoked = true;
        continue;
      }
      target.dataset.gameplazaDigisellerInvoked = "1";
      new Calc($(target));
      invoked = true;
    }
    return invoked;
  } catch (err) {
    if (!options?.silent && !String(err).includes("reading 'loading'")) {
      error("DigiSeller(container) threw", { err: String(err) });
    }
    return false;
  }
}