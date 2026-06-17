import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/marketplace/Layout";

const faqs = [
  { q: "Как быстро приходит товар?", a: "Цифровые товары доставляются мгновенно — ключ или код активации появляется в личном кабинете и приходит на email сразу после оплаты." },
  { q: "Какие способы оплаты доступны?", a: "Банковские карты Visa/MasterCard/МИР, СБП, ЮMoney, криптовалюта и баланс GamePlaza." },
  { q: "Что если товар не работает?", a: "Действует гарантия: если ключ не активируется — мы вернём деньги или заменим товар в течение 15 минут." },
  { q: "Как стать продавцом?", a: "Подключите магазин через Digiseller API. Товары автоматически синхронизируются: цены, остатки, описания." },
  { q: "Есть ли поддержка 24/7?", a: "Да, среднее время ответа поддержки — менее 3 минут. Пишите в чат на сайте или Telegram @gameplaza." },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — частые вопросы — GamePlaza" },
      { name: "description", content: "Ответы на частые вопросы о покупке, доставке и гарантии на цифровые товары." },
    ],
  }),
  component: () => (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Часто задаваемые вопросы</h1>
        <div className="mt-8 space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="group rounded-2xl border border-border bg-card p-5 open:shadow-lg">
              <summary className="cursor-pointer list-none text-base font-semibold marker:hidden">
                <span className="mr-2 text-muted-foreground group-open:rotate-45 inline-block transition">+</span>
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Layout>
  ),
});