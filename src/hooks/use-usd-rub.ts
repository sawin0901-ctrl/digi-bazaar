import { useEffect, useState } from "react";

type State = { rate: number | null; loading: boolean; error: string | null };

let cached: { rate: number; ts: number } | null = null;
const TTL = 10 * 60 * 1000; // 10 min

export function useUsdRub(): State {
  const [state, setState] = useState<State>(() =>
    cached && Date.now() - cached.ts < TTL
      ? { rate: cached.rate, loading: false, error: null }
      : { rate: null, loading: true, error: null },
  );

  useEffect(() => {
    if (cached && Date.now() - cached.ts < TTL) return;
    let aborted = false;
    (async () => {
      try {
        // CBR daily — открытый CORS, актуальный официальный курс ЦБ РФ
        const res = await fetch("https://www.cbr-xml-daily.ru/daily_json.js");
        const json = await res.json();
        const rate = Number(json?.Valute?.USD?.Value);
        if (!rate || Number.isNaN(rate)) throw new Error("bad rate");
        cached = { rate, ts: Date.now() };
        if (!aborted) setState({ rate, loading: false, error: null });
      } catch (e) {
        // fallback — open.er-api.com (тоже с CORS)
        try {
          const res = await fetch("https://open.er-api.com/v6/latest/USD");
          const json = await res.json();
          const rate = Number(json?.rates?.RUB);
          if (!rate) throw new Error("bad fallback");
          cached = { rate, ts: Date.now() };
          if (!aborted) setState({ rate, loading: false, error: null });
        } catch (err) {
          if (!aborted) setState({ rate: null, loading: false, error: String(err) });
        }
      }
    })();
    return () => { aborted = true; };
  }, []);

  return state;
}

export function parseUsdAmount(variant: string | null | undefined): number | null {
  if (!variant) return null;
  const m = variant.match(/(\d+(?:[.,]\d+)?)\s*\$/);
  if (!m) return null;
  return Number(m[1].replace(",", "."));
}