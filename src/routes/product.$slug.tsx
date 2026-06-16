import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/marketplace/Layout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { productQO, productsQO, siteTextQO } from "@/lib/marketplace/queries";
import { logClick } from "@/lib/marketplace/catalog.functions";
import { Star, ShieldCheck, Zap, BadgeCheck, ShoppingBasket, Check, ChevronRight } from "lucide-react";
import { useUsdRub, parseUsdAmount } from "@/hooks/use-usd-rub";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData(productQO(params.slug));
    if (!product) throw notFound();
    await Promise.all([
      context.queryClient.ensureQueryData(productsQO()),
      context.queryClient.ensureQueryData(siteTextQO("buyer_rules")),
      context.queryClient.ensureQueryData(siteTextQO("warranty")),
    ]);
  },
  head: ({ params }) => {
    // Note: head() runs before loader data is available in match cache reliably across SSR;
    // we set conservative defaults and rely on the route-level title once loaded.
    return {
      meta: [
        { title: `Товар ${params.slug} — DIGIVAULT` },
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Товар не найден</h1>
        <Link to="/catalog" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Перейти в каталог</Link>
      </div>
    </Layout>
  ),
  errorComponent: ({ reset, error }) => (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Не удалось загрузить товар</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Повторить</button>
      </div>
    </Layout>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQO(slug));
  const { data: allProducts } = useSuspenseQuery(productsQO());
  const { data: rulesText } = useSuspenseQuery(siteTextQO("buyer_rules"));
  const { data: warrantyText } = useSuspenseQuery(siteTextQO("warranty"));
  const logClickFn = useServerFn(logClick);

  const hasVariants = (product?.variants.length ?? 0) > 0;
  const [variant, setVariant] = useState<string | null>(
    hasVariants && product ? product.variants[0].label : null,
  );
  const [agreed, setAgreed] = useState(false);
  const [tab, setTab] = useState<"description" | "rules" | "reviews" | "warranty">("description");
  const { rate, loading: rateLoading } = useUsdRub();

  if (!product) {
    throw notFound();
  }

  const related = allProducts
    .filter((p) => p.category_slug === product.category_slug && p.slug !== product.slug)
    .slice(0, 4);

  const selectedVariant = product.variants.find((v) => v.label === variant) ?? null;
  const canBuy = (!hasVariants || !!variant) && (!hasVariants || agreed);
  const buyHref = product.buy_url ?? "#";
  const usd = selectedVariant?.usd_amount ?? parseUsdAmount(variant);
  const dynamicPrice =
    selectedVariant?.price_rub != null
      ? selectedVariant.price_rub
      : usd != null && rate != null
        ? Math.ceil(usd * rate)
        : null;
  const displayPrice = dynamicPrice ?? product.price;

  const handleBuy = () => {
    if (!canBuy) return;
    logClickFn({
      data: {
        productSlug: product.slug,
        variantLabel: variant,
        referer: typeof document !== "undefined" ? document.referrer || null : null,
      },
    }).catch(() => {});
  };

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
                  <span className="text-muted-foreground">• рейтинг {product.seller_rating}</span>
                </div>
              </div>
            </div>

            {hasVariants && (
              <div className="mt-7">
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">{product.variant_label ?? "Выберите вариант"}</span>
                  <span className="text-rose-500">*</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const active = v.label === variant;
                    return (
                      <button
                        key={v.label}
                        type="button"
                        onClick={() => setVariant(v.label)}
                        className={
                          "rounded-xl border px-3.5 py-2 text-sm transition " +
                          (active
                            ? "border-primary bg-primary/10 font-semibold text-primary shadow-sm"
                            : "border-border bg-background hover:border-primary/40 hover:bg-muted")
                        }
                      >
                        {v.label}
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
                    Я внимательно прочитал описание товара и полностью принимаю его.
                  </span>
                  <input type="checkbox" className="sr-only" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                </label>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-lg shadow-black/5">
              <div className="flex items-end gap-3">
                <div className="text-4xl font-extrabold tracking-tight">
                  {displayPrice.toLocaleString("ru-RU")} ₽
                </div>
                {product.old_price && !dynamicPrice && (
                  <div className="pb-1 text-base text-muted-foreground line-through">
                    {product.old_price.toLocaleString("ru-RU")} ₽
                  </div>
                )}
              </div>
              {usd != null && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {usd}$ ·{" "}
                  {rate ? (
                    <>по курсу ЦБ РФ <b className="text-foreground">{rate.toFixed(2)} ₽/$</b></>
                  ) : rateLoading ? (
                    "получаем курс…"
                  ) : (
                    "курс недоступен"
                  )}
                </div>
              )}

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
                  onClick={(e) => { if (!canBuy) { e.preventDefault(); return; } handleBuy(); }}
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
                Нажимая на кнопку, вы соглашаетесь с{" "}
                <button type="button" onClick={() => setTab("rules")} className="text-primary hover:underline">правилами покупки</button>.
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
                  <span className="inline-flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{product.seller_rating}</span>
                </div>
                <div className="mt-1 font-semibold">{product.seller}</div>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-10 rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border text-sm">
            {([
              { id: "description", label: "Описание" },
              { id: "rules", label: "Правила покупки" },
              { id: "reviews", label: "Отзывы" },
              { id: "warranty", label: "Гарантии" },
            ] as const).map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={
                    "pb-3 transition " +
                    (active
                      ? "border-b-2 border-primary font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {t.label}
                  {t.id === "reviews" && (
                    <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                      {product.reviews.toLocaleString("ru-RU")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {tab === "description" && (
            <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {tab === "rules" && rulesText && (
            <article className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {rulesText.body}
            </article>
          )}

          {tab === "reviews" && (
            <p className="mt-5 text-sm text-muted-foreground">
              Отзывы скоро появятся на этой странице.
            </p>
          )}

          {tab === "warranty" && warrantyText && (
            <article className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {warrantyText.body}
            </article>
          )}
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