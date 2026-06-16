import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/marketplace/Layout";
import { Star } from "lucide-react";

const reviews = [
  { name: "Алексей М.", rating: 5, text: "Заказал ключ Steam — пришёл через 12 секунд. Цена в 2 раза ниже, чем в магазине!" },
  { name: "Мария К.", rating: 5, text: "Купила Netflix на год, всё работает идеально. Поддержка ответила за 1 минуту." },
  { name: "Дмитрий В.", rating: 5, text: "Удобный интерфейс, мгновенная доставка. Заказываю уже 8-й раз." },
  { name: "Ольга П.", rating: 4, text: "Хороший выбор и адекватные цены. Рекомендую." },
  { name: "Игорь С.", rating: 5, text: "Windows 11 Pro активировался без проблем. Спасибо!" },
  { name: "Юлия Р.", rating: 5, text: "Spotify Premium на 6 месяцев — всё пришло в течение минуты. Отлично!" },
];

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Отзывы покупателей — DIGIVAULT" },
      { name: "description", content: "Реальные отзывы покупателей DIGIVAULT. Рейтинг 4.9/5 на основе 47 000+ отзывов." },
    ],
  }),
  component: () => (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Отзывы покупателей</h1>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          <b>4.9 из 5</b> · 47 320 отзывов
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {reviews.map((r, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{r.name}</div>
                <div className="flex">{Array.from({ length: r.rating }).map((_, k) => <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  ),
});