import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Layout } from "@/components/marketplace/Layout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { categoriesQO, productsQO } from "@/lib/marketplace/queries";
import hero from "@/assets/hero.jpg";
import { ShieldCheck, Zap, Headphones, BadgeCheck, Gamepad2, Gift, Music, Film, Smartphone, CreditCard, Package, Sparkles, Tv, KeyRound, ShoppingBag, Coins, ChevronRight, ChevronLeft } from "lucide-react";
import { useRef } from "react";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQO()),
      context.queryClient.ensureQueryData(productsQO()),
    ]);
  },
  head: () => ({
    meta: [
      { title: "DIGIVAULT — маркетплейс цифровых товаров №1" },
      { name: "description", content: "Игры, подписки, ключи, карты пополнения и софт. Мгновенная доставка 24/7, гарантия возврата, более 18 000 товаров." },
      { property: "og:title", content: "DIGIVAULT — цифровой маркетплейс нового поколения" },
      { property: "og:description", content: "18 000+ товаров, 480 000+ покупателей, мгновенная доставка 24/7." },
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
  component: Index,
});

function Index() {
  const { data: categories } = useSuspenseQuery(categoriesQO());
  const { data: products } = useSuspenseQuery(productsQO());
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
  const iconFor = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes("game") || s.includes("игр")) return Gamepad2;
    if (s.includes("steam")) return Coins;
    if (s.includes("playstation") || s.includes("ps")) return Gamepad2;
    if (s.includes("xbox")) return Gamepad2;
    if (s.includes("nintendo")) return Gamepad2;
    if (s.includes("roblox")) return Package;
    if (s.includes("music") || s.includes("музык") || s.includes("spotify")) return Music;
    if (s.includes("film") || s.includes("кино") || s.includes("video")) return Film;
    if (s.includes("apple") || s.includes("phone") || s.includes("mobile")) return Smartphone;
    if (s.includes("card") || s.includes("карт") || s.includes("popolnen") || s.includes("пополн")) return CreditCard;
    if (s.includes("sub") || s.includes("подпис") || s.includes("tv")) return Tv;
    if (s.includes("key") || s.includes("ключ")) return KeyRound;
    if (s.includes("gift") || s.includes("подар")) return Gift;
    if (s.includes("discount") || s.includes("скид") || s.includes("deal")) return Sparkles;
    return ShoppingBag;
  };
  const stripRef = useRef<HTMLDivElement>(null);
  const scrollStrip = (dx: number) => stripRef.current?.scrollBy({ left: dx, behavior: "smooth" });
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

      {/* Categories — modern Steam/PSN-style strip */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Категории</h2>
          <Link to="/catalog" className="text-sm text-muted-foreground hover:text-foreground">Все категории →</Link>
        </div>

        {/* Icon pills strip */}
        <div className="relative mt-6">
          <button
            type="button"
            aria-label="Назад"
            onClick={() => scrollStrip(-400)}
            className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-border bg-card/90 shadow-lg backdrop-blur transition hover:bg-card md:grid"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div
            ref={stripRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((c) => {
              const Icon = iconFor(c.slug);
              return (
                <Link
                  key={c.slug}
                  to="/catalog"
                  className="group flex shrink-0 snap-start items-center gap-2.5 rounded-full border border-border bg-card/70 px-4 py-2.5 backdrop-blur transition hover:border-fuchsia-400/60 hover:bg-card hover:shadow-lg hover:shadow-fuchsia-500/10"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500/20 via-fuchsia-500/20 to-cyan-500/20 text-foreground transition group-hover:from-violet-500/40 group-hover:to-cyan-500/40">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="whitespace-nowrap text-sm font-medium">{c.name}</span>
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            aria-label="Вперёд"
            onClick={() => scrollStrip(400)}
            className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-border bg-card/90 shadow-lg backdrop-blur transition hover:bg-card md:grid"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Big visual category cards */}
        <div className="mt-6 grid auto-rows-fr grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => {
            const Icon = iconFor(c.slug);
            return (
              <Link
                key={c.slug}
                to="/catalog"
                className="group relative isolate overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-1 hover:border-fuchsia-400/50 hover:shadow-2xl hover:shadow-fuchsia-500/20"
              >
                <div className="aspect-[5/4] overflow-hidden">
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-cyan-500/40" />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute left-4 top-4">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-bold">{c.name}</div>
                    {c.description && <div className="mt-0.5 truncate text-xs text-white/70">{c.description}</div>}
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-black opacity-0 transition group-hover:opacity-100">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
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
