import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Layout } from "@/components/marketplace/Layout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { getProduct, products } from "@/lib/marketplace/data";
import { Star, ShieldCheck, Zap, BadgeCheck } from "lucide-react";

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
  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Главная</Link> / <Link to="/catalog" className="hover:text-foreground">Каталог</Link> / <span>{product.title}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <img src={product.image} alt={product.title} className="aspect-[4/3] w-full object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{product.title}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> <b>{product.rating}</b> ({product.reviews.toLocaleString("ru-RU")} отзывов)</span>
              <span className="text-muted-foreground">Продано: {product.sales.toLocaleString("ru-RU")}</span>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <div className="text-4xl font-extrabold tracking-tight">{product.price.toLocaleString("ru-RU")} ₽</div>
              {product.oldPrice && <div className="text-lg text-muted-foreground line-through">{product.oldPrice.toLocaleString("ru-RU")} ₽</div>}
            </div>

            {product.buyUrl ? (
              <a
                href={product.buyUrl}
                target="_blank"
                rel="noopener nofollow sponsored"
                className="mt-6 block w-full rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 py-4 text-center text-base font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:opacity-90"
              >
                Купить мгновенно
              </a>
            ) : (
              <button className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 py-4 text-base font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:opacity-90">Купить мгновенно</button>
            )}
            {product.detailsUrl && (
              <a
                href={product.detailsUrl}
                target="_blank"
                rel="noopener nofollow sponsored"
                className="mt-3 block w-full rounded-xl border border-border py-3 text-center text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Подробнее на площадке продавца
              </a>
            )}

            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20"><BadgeCheck className="h-5 w-5" /></div>
                <div>
                  <div className="font-semibold">{product.seller}</div>
                  <div className="text-xs text-muted-foreground">Рейтинг продавца: {product.sellerRating} • Верифицирован</div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-border p-3"><Zap className="h-4 w-4" /><div className="mt-2 font-semibold">Мгновенно</div><div className="text-muted-foreground">Доставка после оплаты</div></div>
              <div className="rounded-xl border border-border p-3"><ShieldCheck className="h-4 w-4" /><div className="mt-2 font-semibold">Гарантия</div><div className="text-muted-foreground">Возврат при сбое</div></div>
              <div className="rounded-xl border border-border p-3"><BadgeCheck className="h-4 w-4" /><div className="mt-2 font-semibold">Официально</div><div className="text-muted-foreground">Проверенный товар</div></div>
            </div>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-bold">Описание</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{product.description}</p>
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