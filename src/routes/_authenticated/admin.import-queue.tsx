import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/marketplace/Layout";
import {
  adminListImportQueue,
  adminRunImportNow,
  adminEnqueueImport,
  adminRetryFailedImport,
  adminDeleteQueueRow,
} from "@/lib/admin/import-queue.functions";
import { Play, Trash2, RefreshCw, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/import-queue")({
  head: () => ({ meta: [{ title: "Очередь импорта — DIGIVAULT" }] }),
  component: ImportQueuePage,
});

function ImportQueuePage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListImportQueue);
  const runNow = useServerFn(adminRunImportNow);
  const enqueue = useServerFn(adminEnqueueImport);
  const retry = useServerFn(adminRetryFailedImport);
  const remove = useServerFn(adminDeleteQueueRow);

  const q = useQuery({
    queryKey: ["admin", "import-queue"],
    queryFn: () => list(),
    refetchInterval: 5000,
  });

  const [newId, setNewId] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "import-queue"] });

  const runMut = useMutation({ mutationFn: () => runNow(), onSuccess: invalidate });
  const enqMut = useMutation({
    mutationFn: (id: string) => enqueue({ data: { digisellerId: id } }),
    onSuccess: () => {
      setNewId("");
      invalidate();
    },
  });
  const retryMut = useMutation({
    mutationFn: (id: string) => retry({ data: { id } }),
    onSuccess: invalidate,
  });
  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
  });

  const stats = q.data?.stats ?? { pending: 0, done: 0, failed: 0, total: 0 };
  const rows = q.data?.rows ?? [];

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Очередь автоимпорта</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Автоматически добавляются товары, на которые ссылаются описания уже импортированных карточек.
              Cron берёт по одной карточке в час, чтобы не нагружать систему.
            </p>
          </div>
          <Link
            to="/_authenticated/admin"
            className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            ← В админку
          </Link>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="В очереди" value={stats.pending} tone="amber" />
          <StatCard label="Импортировано" value={stats.done} tone="emerald" />
          <StatCard label="Ошибки" value={stats.failed} tone="rose" />
          <StatCard label="Всего записей" value={stats.total} tone="slate" />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            value={newId}
            onChange={(e) => setNewId(e.target.value.replace(/\D/g, ""))}
            placeholder="ID товара plati.market (например 5302002)"
            className="flex-1 min-w-[220px] rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => newId && enqMut.mutate(newId)}
            disabled={!newId || enqMut.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> В очередь
          </button>
          <button
            onClick={() => runMut.mutate()}
            disabled={runMut.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            <Play className="h-4 w-4" /> Импортировать сейчас
          </button>
          {runMut.data && "processed" in runMut.data && (
            <span className="text-xs text-muted-foreground">
              {runMut.data.processed
                ? `Обработан ${runMut.data.digiseller_id} — ${runMut.data.ok ? "успешно" : "ошибка"}`
                : "Очередь пуста"}
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">ID товара</th>
                <th className="px-3 py-2 text-left">Статус</th>
                <th className="px-3 py-2 text-left">Попыток</th>
                <th className="px-3 py-2 text-left">Добавлено</th>
                <th className="px-3 py-2 text-left">Обработано</th>
                <th className="px-3 py-2 text-left">Ошибка</th>
                <th className="px-3 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Очередь пуста.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60 align-top">
                  <td className="px-3 py-2 font-mono">
                    {r.status === "done" ? (
                      <Link
                        to="/product/$slug"
                        params={{ slug: `digi-${r.digiseller_id}` }}
                        className="text-primary underline"
                      >
                        {r.digiseller_id}
                      </Link>
                    ) : (
                      <a
                        href={`https://plati.market/itm/${r.digiseller_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {r.digiseller_id}
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2">{r.attempts}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("ru-RU")}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.processed_at ? new Date(r.processed_at).toLocaleString("ru-RU") : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-rose-500">
                    {r.last_error ? r.last_error.slice(0, 120) : ""}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {r.status !== "pending" && (
                        <button
                          onClick={() => retryMut.mutate(r.id)}
                          title="Повторить"
                          className="rounded-lg border border-border p-1.5 hover:bg-muted"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => delMut.mutate(r.id)}
                        title="Удалить"
                        className="rounded-lg border border-border p-1.5 hover:bg-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "rose" | "slate";
}) {
  const toneClass: Record<typeof tone, string> = {
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    rose: "text-rose-500",
    slate: "text-foreground",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass[tone]}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Ожидает", cls: "bg-amber-500/15 text-amber-600" },
    done: { label: "Готово", cls: "bg-emerald-500/15 text-emerald-600" },
    failed: { label: "Ошибка", cls: "bg-rose-500/15 text-rose-600" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-foreground" };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}