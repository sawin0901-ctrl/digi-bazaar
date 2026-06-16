import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/marketplace/Layout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { products } from "@/lib/marketplace/data";

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "Скидки до −70% — DIGIVAULT" },
      { name: "description", content: "Лучшие скидки на цифровые товары — игры, подписки, ключи и софт." },
    ],
  }),
  component: () => {
    const list = products.filter((p) => p.oldPrice);
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">🔥 Горячие скидки</h1>
          <p className="mt-2 text-sm text-muted-foreground">Экономьте до 70% на проверенных цифровых товарах</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        </div>
      </Layout>
    );
  },
});