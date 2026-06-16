import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Layout } from "@/components/marketplace/Layout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { getProduct, products } from "@/lib/marketplace/data";
import { Star, ShieldCheck, Zap, BadgeCheck, ShoppingBasket, Check, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.title} — DIGIVAULT` },
          { name: "description", content: loaderData.product.description },
          { property: "og:title", content: loaderData.product.title },
          { property: "og:image", content: loaderData.product.image },
        ]
      : [{ title: "Товар не найден — DIGIVAULT" }],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Товар не найден</h1>
        <Link to="/catalog" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Перейти в каталог</Link>
      </div>
    </Layout>
  ),
  errorComponent: ({ reset }) => (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Не удалось загрузить товар</h1>
        <button onClick={reset} className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Повторить</button>
      </div>
    </Layout>
  ),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const related = products.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 4);
  const [variant, setVariant] = useState<string | null>(product.variants?.[0] ?? null);
  const [agreed, setAgreed] = useState(false);
  const canBuy = (!product.variants || !!variant) && (!product.variants || agreed);
  const buyHref = product.buyUrl ?? "#";
  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Главная</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/catalog" className="hover:text-foreground">Каталог</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate text-foreground/80">{product.title}</span>
        </nav>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT — main product card */}
          <div className="rounded-3xl border border-border bg-card p-5 md:p-7">
            <div className="grid gap-6 md:grid-cols-[260px_1fr]">
              <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                <img src={product.image} alt={product.title} className="aspect-square w-full object-cover" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight tracking-tight md:text-[28px]">{product.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>Продано <b className="text-foreground">{product.sales.toLocaleString("ru-RU")}</b></span>
                  <span className="text-border">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <b className="text-foreground">{product.rating}</b>
                    <span>({product.reviews.toLocaleString("ru-RU")} отзывов)</span>
                  </span>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30"><BadgeCheck className="h-3 w-3" /></div>
                  <span className="font-medium">{product.seller}</span>
                  <span className="text-muted-foreground">• рейтинг {product.sellerRating}</span>
                </div>
              </div>
            </div>

            {product.variants && product.variants.length > 0 && (
              <div className="mt-7">
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">{product.variantLabel ?? "Выберите вариант"}</span>
                  <span className="text-rose-500">*</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const active = v === variant;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVariant(v)}
                        className={
                          "rounded-xl border px-3.5 py-2 text-sm transition " +
                          (active
                            ? "border-primary bg-primary/10 font-semibold text-primary shadow-sm"
                            : "border-border bg-background hover:border-primary/40 hover:bg-muted")
                        }
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>

                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/50 p-4 text-sm">
                  <span
                    onClick={(e) => { e.preventDefault(); setAgreed((v) => !v); }}
                    className={
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition " +
                      (agreed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")
                    }
                  >
                    {agreed && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-muted-foreground">
                    Я внимательно прочитал описание товара и полностью принимаю его, а также отдельно подтверждаю, что мой аккаунт Apple относится к региону <b className="text-foreground">США</b>.
                  </span>
                  <input type="checkbox" className="sr-only" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                </label>
              </div>
            )}
          </div>

          {/* RIGHT — sticky purchase card */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-lg shadow-black/5">
              <div className="flex items-end gap-3">
                <div className="text-4xl font-extrabold tracking-tight">{product.price.toLocaleString("ru-RU")} ₽</div>
                {product.oldPrice && <div className="pb-1 text-base text-muted-foreground line-through">{product.oldPrice.toLocaleString("ru-RU")} ₽</div>}
              </div>

              <div className="mt-5 flex items-stretch gap-2">
                <button
                  type="button"
                  aria-label="В корзину"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-background text-foreground transition hover:bg-muted"
                >
                  <ShoppingBasket className="h-5 w-5" />
                </button>
                <a
                  href={canBuy ? buyHref : undefined}
                  target="_blank"
                  rel="noopener nofollow sponsored"
                  aria-disabled={!canBuy}
                  onClick={(e) => { if (!canBuy) e.preventDefault(); }}
                  className={
                    "flex-1 rounded-xl py-3 text-center text-sm font-semibold transition " +
                    (canBuy
                      ? "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 text-white shadow-lg shadow-fuchsia-500/30 hover:opacity-90"
                      : "cursor-not-allowed bg-muted text-muted-foreground")
                  }
                >
                  Купить сейчас
                </a>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Нажимая на кнопку, вы соглашаетесь с <a href={product.detailsUrl ?? "#"} target="_blank" rel="noopener nofollow" className="text-primary hover:underline">правилами покупки</a>.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">Безопасная сделка</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">Мгновенная доставка</span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Продавец</span>
                  <span className="inline-flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{product.sellerRating}</span>
                </div>
                <div className="mt-1 font-semibold">{product.seller}</div>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-10 rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="flex gap-6 border-b border-border text-sm">
            <div className="border-b-2 border-primary pb-3 font-semibold text-primary">Описание</div>
            <div className="pb-3 text-muted-foreground">Отзывы <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{product.reviews.toLocaleString("ru-RU")}</span></div>
            <div className="pb-3 text-muted-foreground">Гарантии</div>
          </div>
          <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>
        </section>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold">Похожие товары</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}