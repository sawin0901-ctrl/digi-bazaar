import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/marketplace/Layout";
import {
  adminAvailabilityOverview,
  adminRunAvailabilityNow,
} from "@/lib/admin/availability.functions";
import { Play, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-availability")({
  head: () => ({ meta: [{ title: "Доступность товаров — DIGIVAULT" }] }),
  component: AvailabilityPage,
});

const REASON_LABEL: Record<string, string> = {
  out_of_stock: "Товар закончился",
  paused: "Продажа приостановлена",
  blocked: "Заблокирован",
  unavailable: "Недоступен",
  fetch_error: "Ошибка получения",
  deleted: "Удалён у поставщика",
};

const EVENT_LABEL: Record<string, string> = {
  hidden: "Скрыт",
  restored: "Восстановлен",
  deleted: "Удалён",
  checked: "Проверка",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ru-RU");
}

function AvailabilityPage() {
  const qc = useQueryClient();
  const overview = useServerFn(adminAvailabilityOverview);
  const runNow = useServerFn(adminRunAvailabilityNow);

  const q = useQuery({
    queryKey: ["admin", "availability"],
    queryFn: () => overview(),
    refetchInterval: 30_000,
  });

  const runMut = useMutation({
    mutationFn: () => runNow(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "availability"] }),
  });

  const data = q.data;
  const stats = data?.stats ?? { active: 0, hidden: 0, pending_delete: 0 };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Доступность товаров</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Авто-проверка через Digiseller. Активные — раз в сутки, скрытые — раз в 3 дня.
              После 14 дней непрерывной недоступности карточка удаляется навсегда.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin"
              className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              ← В админку
            </Link>
            <button
              onClick={() => runMut.mutate()}
              disabled={runMut.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {runMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Запустить проверку
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Активные" value={stats.active} tone="emerald" />
          <StatCard label="Скрытые" value={stats.hidden} tone="amber" />
          <StatCard label="На удаление (≥14 дн.)" value={stats.pending_delete} tone="rose" />
        </div>

        <Section title={`Скрытые товары (${data?.hidden.length ?? 0})`}>
          {(data?.hidden ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет скрытых товаров.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Товар</th>
                    <th className="px-3 py-2">Причина</th>
                    <th className="px-3 py-2">Скрыт</th>
                    <th className="px-3 py-2">Дней</th>
                    <th className="px-3 py-2">Проверен</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.hidden.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.slug}
                          {p.digiseller_id ? ` · ${p.digiseller_id}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {REASON_LABEL[p.hide_reason ?? ""] ?? p.hide_reason ?? "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmt(p.hidden_at)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            (p.days_hidden ?? 0) >= 14
                              ? "rounded bg-rose-500/20 px-2 py-0.5 text-rose-300"
                              : (p.days_hidden ?? 0) >= 7
                              ? "rounded bg-amber-500/20 px-2 py-0.5 text-amber-300"
                              : "text-muted-foreground"
                          }
                        >
                          {p.days_hidden ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {fmt(p.last_checked_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={`История проверок (${data?.log.length ?? 0})`}>
          {(data?.log ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Журнал пуст.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Когда</th>
                    <th className="px-3 py-2">Событие</th>
                    <th className="px-3 py-2">Товар</th>
                    <th className="px-3 py-2">Причина</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.log.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {fmt(l.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            l.event === "restored"
                              ? "rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300"
                              : l.event === "deleted"
                              ? "rounded bg-rose-500/20 px-2 py-0.5 text-rose-300"
                              : "rounded bg-amber-500/20 px-2 py-0.5 text-amber-300"
                          }
                        >
                          {EVENT_LABEL[l.event] ?? l.event}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs">{l.slug ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{l.digiseller_id ?? ""}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {REASON_LABEL[l.reason ?? ""] ?? l.reason ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
      : "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-xs uppercase opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}