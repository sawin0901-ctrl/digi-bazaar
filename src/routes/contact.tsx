import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/marketplace/Layout";
import { Mail, MessageCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Контакты — GamePlaza" },
      { name: "description", content: "Свяжитесь с командой GamePlaza. Поддержка 24/7, среднее время ответа — менее 3 минут." },
    ],
  }),
  component: () => (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Свяжитесь с нами</h1>
        <p className="mt-2 text-sm text-muted-foreground">Поддержка 24/7. Среднее время ответа — менее 3 минут.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Mail, title: "Email", value: "support@gameplaza.site" },
            { icon: MessageCircle, title: "Telegram", value: "@gameplaza" },
            { icon: Phone, title: "Телефон", value: "+7 (800) 555-00-00" },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-card p-6">
              <c.icon className="h-5 w-5" />
              <div className="mt-3 text-sm text-muted-foreground">{c.title}</div>
              <div className="mt-1 font-semibold">{c.value}</div>
            </div>
          ))}
        </div>

        <form className="mt-10 rounded-3xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-xl font-bold">Написать в поддержку</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input placeholder="Имя" className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
            <input placeholder="Email" type="email" className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
          </div>
          <textarea placeholder="Сообщение" rows={5} className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
          <button type="button" className="mt-4 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30">Отправить</button>
        </form>
      </div>
    </Layout>
  ),
});