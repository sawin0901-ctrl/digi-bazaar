import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { ProductDTO } from "@/lib/marketplace/catalog.functions";
import type { ReactNode } from "react";

const badgeStyle: Record<string, string> = {
  HOT: "bg-gradient-to-r from-orange-500 to-rose-500 text-white",
  NEW: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white",
  "-50%": "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white",
  "ТОП": "bg-gradient-to-r from-amber-400 to-orange-500 text-white",
};

export function ProductCard({ product }: { product: ProductDTO }) {
  const cls = "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-2xl hover:shadow-fuchsia-500/10";
  const inner: ReactNode = (
    <>
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img src={product.image} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" loading="lazy" />
        {product.badge && (
          <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-lg ${badgeStyle[product.badge] ?? "bg-primary text-primary-foreground"}`}>
            {product.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.title}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>({product.reviews.toLocaleString("ru-RU")})</span>
          <span className="ml-auto">{product.seller}</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="text-xl font-bold tracking-tight">{product.price.toLocaleString("ru-RU")} ₽</div>
            {product.old_price && <div className="text-xs text-muted-foreground line-through">{product.old_price.toLocaleString("ru-RU")} ₽</div>}
          </div>
          <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition group-hover:bg-primary/90">Купить</span>
        </div>
      </div>
    </>
  );
  if (product.external_url) {
    return (
      <a href={product.external_url} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link to="/product/$slug" params={{ slug: product.slug }} className={cls}>
      {inner}
    </Link>
  );
}