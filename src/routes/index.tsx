import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Layout } from "@/components/marketplace/Layout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { categories, products } from "@/lib/marketplace/data";
import hero from "@/assets/hero.jpg";
import { ShieldCheck, Zap, Headphones, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DIGIVAULT — маркетплейс цифровых товаров №1" },
      { name: "description", content: "Игры, подписки, ключи, карты пополнения и софт. Мгновенная доставка 24/7, гарантия возврата, более 18 000 товаров." },
      { property: "og:title", content: "DIGIVAULT — цифровой маркетплейс нового поколения" },
      { property: "og:description", content: "18 000+ товаров, 480 000+ покупателей, мгновенная доставка 24/7." },
    ],
  }),
  component: Index,
});

function Index() {
  const stats = [
    { label: "Товаров", value: "18 420+" },
    { label: "Продавцов", value: "1 240" },
    { label: "Покупателей", value: "480 000+" },
    { label: "Успешных заказов", value: "3.4M" },
  ];
  const trust = [
    { icon: Zap, title: "Мгновенная доставка", text: "Ключ или код приходит сразу после оплаты" },
    { icon: ShieldCheck, title: "Безопасные платежи", text: "PCI DSS, 3-D Secure, возврат при сбое" },
    { icon: BadgeCheck, title: "Проверенные продавцы", text: "Рейтинг и верификация каждого магазина" },
    { icon: Headphones, title: "Поддержка 24/7", text: "Среднее время ответа — менее 3 минут" },
  ];
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={hero} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
        <div className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,_oklch(0.7_0.25_320/0.25),_transparent_60%)]" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Новые товары добавляются каждые 5 минут
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight md:text-6xl">
              Маркетплейс цифровых товаров{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">нового поколения</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Игры, подписки, ключи, карты пополнения и софт. Мгновенная доставка, гарантия и поддержка 24/7.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/catalog" className="rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:opacity-90">
                Открыть каталог
              </Link>
              <Link to="/deals" className="rounded-xl border border-border bg-card/60 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-card">
                Скидки до −70%
              </Link>
            </div>
          </div>
          {/* Stats */}
          <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card/60 p-5 text-center backdrop-blur">
                <div className="text-2xl font-extrabold tracking-tight md:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Категории</h2>
          <Link to="/catalog" className="text-sm text-muted-foreground hover:text-foreground">Все категории →</Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.slug} to="/catalog" className="group relative overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-[5/4] overflow-hidden">
                <img src={c.image} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <div className="text-lg font-bold">{c.name}</div>
                <div className="mt-0.5 text-xs text-white/70">{c.description}</div>
                <div className="mt-2 text-xs text-white/60">{c.count.toLocaleString("ru-RU")} товаров</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Хиты продаж</h2>
            <p className="mt-1 text-sm text-muted-foreground">Самые популярные товары этой недели</p>
          </div>
          <Link to="/catalog" className="text-sm text-muted-foreground hover:text-foreground">Смотреть все →</Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((t) => (
            <div key={t.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-foreground">
                <t.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold">{t.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 p-8 text-white md:p-12">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <h3 className="text-2xl font-bold md:text-3xl">Станьте продавцом DIGIVAULT</h3>
            <p className="mt-2 text-white/80">Подключение Digiseller API, автоматическая синхронизация товаров и моментальные выплаты.</p>
            <Link to="/contact" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-foreground hover:bg-white/90">Подключить магазин</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
