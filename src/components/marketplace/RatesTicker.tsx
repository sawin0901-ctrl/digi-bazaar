import { useQuery } from "@tanstack/react-query";
import { DollarSign, Euro, Bitcoin } from "lucide-react";

type Rates = { usd: number | null; eur: number | null; btc: number | null; updated_at: string };

function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function RatesTicker() {
  const { data } = useQuery<Rates>({
    queryKey: ["fx-rates"],
    queryFn: async () => {
      const r = await fetch("/api/public/rates");
      if (!r.ok) throw new Error("rates failed");
      return r.json();
    },
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  return (
    <div className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-4 py-1.5 sm:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <span className="hidden sm:inline">Курс ЦБ РФ / крипто:</span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-medium text-foreground">USD</span>
          <span>{fmt(data?.usd)} ₽</span>
        </span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Euro className="h-3.5 w-3.5 text-sky-500" />
          <span className="font-medium text-foreground">EUR</span>
          <span>{fmt(data?.eur)} ₽</span>
        </span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Bitcoin className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-medium text-foreground">BTC</span>
          <span>{fmt(data?.btc, 0)} ₽</span>
        </span>
      </div>
    </div>
  );
}