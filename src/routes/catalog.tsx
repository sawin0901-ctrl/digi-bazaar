import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Layout } from "@/components/marketplace/Layout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { categoriesQO, productsQO } from "@/lib/marketplace/queries";

export const Route = createFileRoute("/catalog")({
  validateSearch: (s: Record<string, unknown>) => ({
    category: typeof s.category === "string" ? s.category : undefined,
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQO()),
      context.queryClient.ensureQueryData(productsQO()),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Каталог цифровых товаров — GamePlaza" },
      { name: "description", content: "Каталог из 18 000+ цифровых товаров: игры, подписки, ключи, карты и софт." },
    ],
  }),
  errorComponent: ({ error }) => (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Не удалось загрузить каталог</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </Layout>
  ),
  component: CatalogPage,
});

function CatalogPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalog" });
  const cat = search.category ?? "all";
  const setCat = (next: string) =>
    navigate({ search: { category: next === "all" ? undefined : next } });
  const [sort, setSort] = useState<string>("popular");
  const { data: categories } = useSuspenseQuery(categoriesQO());
  const { data: products } = useSuspenseQuery(
    productsQO(cat === "all" ? undefined : { category: cat }),
  );

  const list = useMemo(() => {
    let arr = [...products];
    if (sort === "price-asc") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") arr.sort((a, b) => b.price - a.price);
    else if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    else arr.sort((a, b) => b.sales - a.sales);
    return arr;
  }, [sort, products]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {cat === "all" ? "Каталог" : (categories.find((c) => c.slug === cat)?.name ?? "Каталог")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Найдено {list.length} товаров</p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button onClick={() => setCat("all")} className={`rounded-full border px-4 py-2 text-sm transition ${cat === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>Все</button>
          {categories.map((c) => (
            <button key={c.slug} onClick={() => setCat(c.slug)} className={`rounded-full border px-4 py-2 text-sm transition ${cat === c.slug ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>{c.name}</button>
          ))}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto h-10 rounded-xl border border-border bg-background px-3 text-sm">
            <option value="popular">По популярности</option>
            <option value="price-asc">Сначала дешёвые</option>
            <option value="price-desc">Сначала дорогие</option>
            <option value="rating">По рейтингу</option>
          </select>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>
      </div>
    </Layout>
  );
}