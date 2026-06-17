import { createFileRoute } from "@tanstack/react-router";

type Rates = {
  usd: number | null;
  eur: number | null;
  btc: number | null;
  updated_at: string;
};

let cache: { at: number; data: Rates } | null = null;
const TTL_MS = 10 * 60_000; // 10 minutes

async function fetchRates(): Promise<Rates> {
  // USD / EUR → RUB from the Russian Central Bank daily snapshot.
  // BTC → RUB from CoinGecko.
  const [cbrRes, btcRes] = await Promise.allSettled([
    fetch("https://www.cbr-xml-daily.ru/daily_json.js", { headers: { Accept: "application/json" } }),
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=rub", {
      headers: { Accept: "application/json" },
    }),
  ]);

  let usd: number | null = null;
  let eur: number | null = null;
  if (cbrRes.status === "fulfilled" && cbrRes.value.ok) {
    const j = (await cbrRes.value.json()) as { Valute?: Record<string, { Value?: number }> };
    usd = j.Valute?.USD?.Value ?? null;
    eur = j.Valute?.EUR?.Value ?? null;
  }

  let btc: number | null = null;
  if (btcRes.status === "fulfilled" && btcRes.value.ok) {
    try {
      const j = (await btcRes.value.json()) as { bitcoin?: { rub?: number } };
      btc = j.bitcoin?.rub ?? null;
    } catch {
      btc = null;
    }
  }

  // Fallback 1: Coinbase BTC-RUB spot
  if (btc == null) {
    try {
      const r = await fetch("https://api.coinbase.com/v2/prices/BTC-RUB/spot", {
        headers: { Accept: "application/json" },
      });
      if (r.ok) {
        const j = (await r.json()) as { data?: { amount?: string } };
        const v = Number(j.data?.amount);
        if (Number.isFinite(v) && v > 0) btc = v;
      }
    } catch {
      /* ignore */
    }
  }

  // Fallback 2: Binance BTC/USDT × USD→RUB (CBR)
  if (btc == null && usd != null) {
    try {
      const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", {
        headers: { Accept: "application/json" },
      });
      if (r.ok) {
        const j = (await r.json()) as { price?: string };
        const v = Number(j.price);
        if (Number.isFinite(v) && v > 0) btc = Math.round(v * usd);
      }
    } catch {
      /* ignore */
    }
  }

  return { usd, eur, btc, updated_at: new Date().toISOString() };
}

export const Route = createFileRoute("/api/public/rates")({
  server: {
    handlers: {
      GET: async () => {
        const now = Date.now();
        if (!cache || now - cache.at > TTL_MS) {
          try {
            cache = { at: now, data: await fetchRates() };
          } catch {
            // keep stale cache on transient failure
            if (!cache) cache = { at: now, data: { usd: null, eur: null, btc: null, updated_at: new Date().toISOString() } };
          }
        }
        return new Response(JSON.stringify(cache.data), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300, s-maxage=600",
          },
        });
      },
    },
  },
});