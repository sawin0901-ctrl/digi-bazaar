import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/marketplace/Layout";
import { supabase } from "@/integrations/supabase/client";
import {
  checkIsAdmin,
  adminListProducts,
  adminUpsertProduct,
  adminDeleteProduct,
  adminListCategories,
  adminGetSetting,
  adminSetSetting,
  adminImportDigisellerProduct,
  type AdminProduct,
  type ProductInput,
} from "@/lib/admin/admin.functions";
import {
  adminListSeo,
  adminGetSeo,
  adminRegenerateSeo,
  adminUpdateSeo,
  adminToggleSeoLock,
  adminBulkRegenerateSeo,
} from "@/lib/seo/seo.functions";
import { Trash2, Plus, LogOut, Save, X, Download, Sparkles, Lock, Unlock, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Админка — DIGIVAULT" }] }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const checkFn = useServerFn(checkIsAdmin);
  const adminList = useServerFn(adminListProducts);
  const upsert = useServerFn(adminUpsertProduct);
  const del = useServerFn(adminDeleteProduct);
  const listCats = useServerFn(adminListCategories);
  const getSetting = useServerFn(adminGetSetting);
  const setSetting = useServerFn(adminSetSetting);
  const importDigi = useServerFn(adminImportDigisellerProduct);

  const admin = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const products = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => adminList(),
    enabled: admin.data?.isAdmin === true,
  });
  const cats = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => listCats(),
    enabled: admin.data?.isAdmin === true,
  });
  const ai = useQuery({
    queryKey: ["admin", "partner_ai"],
    queryFn: () => getSetting({ data: { key: "partner_ai" } }),
    enabled: admin.data?.isAdmin === true,
  });

  const [editing, setEditing] = useState<Partial<AdminProduct> | null>(null);

  const saveMut = useMutation({
    mutationFn: (data: ProductInput) => upsert({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
  const aiMut = useMutation({
    mutationFn: (value: string) => setSetting({ data: { key: "partner_ai", value } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "partner_ai"] }),
  });
  const importMut = useMutation({
    mutationFn: (vars: { digisellerId: string; categorySlug?: string | null }) =>
      importDigi({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
  });
  const [importId, setImportId] = useState("");
  const [importCat, setImportCat] = useState("");

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (admin.isLoading) {
    return <Layout><div className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground">Загрузка…</div></Layout>;
  }
  if (admin.error || !admin.data?.isAdmin) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Нет доступа</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            У вашего аккаунта нет роли <b>admin</b>. ID пользователя:{" "}
            <code className="rounded bg-muted px-2 py-0.5 text-xs">{admin.data?.userId ?? "—"}</code>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Пришлите этот ID, чтобы выдать роль администратора.</p>
          <button onClick={handleSignOut} className="mt-6 rounded-xl border border-border bg-card px-4 py-2 text-sm">Выйти</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Админка</h1>
            <p className="mt-1 text-sm text-muted-foreground">Управление каталогом</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-muted">← на сайт</Link>
            <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
              <LogOut className="h-4 w-4" /> Выйти
            </button>
          </div>
        </div>

        {/* Partner AI setting */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <label className="text-sm font-semibold">Партнёрский ID (ai)</label>
          <p className="mt-1 text-xs text-muted-foreground">
            Используется во всех партнёрских ссылках plati.market / oplata.info.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              defaultValue={ai.data ?? ""}
              onBlur={(e) => { if (e.target.value !== ai.data) aiMut.mutate(e.target.value); }}
              className="w-48 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="1022102"
            />
            {aiMut.isPending && <span className="text-xs text-muted-foreground">сохранение…</span>}
            {aiMut.isSuccess && <span className="text-xs text-emerald-500">сохранено</span>}
          </div>
        </div>

        {/* Import a single Digiseller product */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <label className="text-sm font-semibold">Импорт товара с Digiseller по ID</label>
          <p className="mt-1 text-xs text-muted-foreground">
            Например, <code className="rounded bg-muted px-1">3300218</code>. Описание, цена и
            картинка возьмутся с plati.market; партнёрские ссылки соберутся автоматически.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={importId}
              onChange={(e) => setImportId(e.target.value.replace(/\D+/g, ""))}
              placeholder="ID товара"
              className="w-40 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <select
              value={importCat}
              onChange={(e) => setImportCat(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Категория: Импорт (по умолчанию)</option>
              {cats.data?.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (!importId) return;
                importMut.mutate({ digisellerId: importId, categorySlug: importCat || null });
              }}
              disabled={!importId || importMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {importMut.isPending ? "Импорт…" : "Импортировать"}
            </button>
            {importMut.isSuccess && (
              <span className="text-xs text-emerald-500">
                {importMut.data.created ? "добавлен" : "обновлён"}: /{importMut.data.slug}
              </span>
            )}
            {importMut.error && (
              <span className="text-xs text-rose-500">{importMut.error.message}</span>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Товары ({products.data?.length ?? 0})</h2>
          <button
            onClick={() => setEditing({
              slug: "", title: "", category_slug: cats.data?.[0]?.slug ?? "cards",
              seller: "", seller_rating: 5, price: 0, old_price: null,
              rating: 5, reviews: 0, sales: 0, image: "", badge: null,
              description: "", digiseller_id: null, variant_label: null,
              is_active: true, sort_order: 0,
            })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30"
          >
            <Plus className="h-4 w-4" /> Новый товар
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Slug / Название</th>
                <th className="p-3">Категория</th>
                <th className="p-3">Цена</th>
                <th className="p-3">Активен</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.data?.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.category_slug}</td>
                  <td className="p-3">{p.price.toLocaleString("ru-RU")} ₽</td>
                  <td className="p-3">
                    <span className={p.is_active ? "text-emerald-500" : "text-muted-foreground"}>
                      {p.is_active ? "да" : "нет"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setEditing(p)} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Изменить</button>
                    <button
                      onClick={() => { if (confirm(`Удалить «${p.title}»?`)) delMut.mutate(p.id); }}
                      className="ml-2 inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {products.data?.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Товаров пока нет</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditDialog
          initial={editing}
          categories={cats.data ?? []}
          onClose={() => setEditing(null)}
          onSave={(d) => saveMut.mutate(d)}
          saving={saveMut.isPending}
          error={saveMut.error?.message}
        />
      )}
      <SeoSection isAdmin={admin.data?.isAdmin === true} />
    </Layout>
  );
}

function EditDialog({
  initial,
  categories,
  onClose,
  onSave,
  saving,
  error,
}: {
  initial: Partial<AdminProduct>;
  categories: { slug: string; name: string }[];
  onClose: () => void;
  onSave: (d: ProductInput) => void;
  saving: boolean;
  error?: string;
}) {
  const [f, setF] = useState<Partial<AdminProduct>>(initial);
  const upd = <K extends keyof AdminProduct>(k: K, v: AdminProduct[K]) => setF((s) => ({ ...s, [k]: v }));

  const submit = () => {
    onSave({
      id: f.id ?? null,
      slug: f.slug ?? "",
      title: f.title ?? "",
      category_slug: f.category_slug ?? categories[0]?.slug ?? "cards",
      seller: f.seller ?? "",
      seller_rating: Number(f.seller_rating ?? 5),
      price: Number(f.price ?? 0),
      old_price: f.old_price == null ? null : Number(f.old_price),
      rating: Number(f.rating ?? 5),
      reviews: Number(f.reviews ?? 0),
      sales: Number(f.sales ?? 0),
      image: f.image ?? "",
      badge: f.badge ?? null,
      description: f.description ?? "",
      digiseller_id: f.digiseller_id ?? null,
      variant_label: f.variant_label ?? null,
      is_active: f.is_active ?? true,
      sort_order: Number(f.sort_order ?? 0),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur">
      <div className="mt-8 w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{f.id ? "Редактирование" : "Новый товар"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Slug *">
            <input value={f.slug ?? ""} onChange={(e) => upd("slug", e.target.value)} className={inp} placeholder="apple-itunes-usa" />
          </Field>
          <Field label="Категория">
            <select value={f.category_slug ?? ""} onChange={(e) => upd("category_slug", e.target.value)} className={inp}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Название *" full>
            <input value={f.title ?? ""} onChange={(e) => upd("title", e.target.value)} className={inp} />
          </Field>
          <Field label="Картинка (URL) *" full>
            <input value={f.image ?? ""} onChange={(e) => upd("image", e.target.value)} className={inp} placeholder="https://..." />
          </Field>
          <Field label="Описание" full>
            <textarea value={f.description ?? ""} onChange={(e) => upd("description", e.target.value)} rows={5} className={inp} />
          </Field>
          <Field label="ID на plati.market (digiseller)">
            <input value={f.digiseller_id ?? ""} onChange={(e) => upd("digiseller_id", e.target.value || null)} className={inp} placeholder="672298" />
          </Field>
          <Field label="Подпись над вариантами">
            <input value={f.variant_label ?? ""} onChange={(e) => upd("variant_label", e.target.value || null)} className={inp} placeholder="Сумма на карте" />
          </Field>
          <Field label="Продавец">
            <input value={f.seller ?? ""} onChange={(e) => upd("seller", e.target.value)} className={inp} />
          </Field>
          <Field label="Рейтинг продавца">
            <input type="number" step="0.01" value={f.seller_rating ?? 5} onChange={(e) => upd("seller_rating", Number(e.target.value))} className={inp} />
          </Field>
          <Field label="Цена (₽)">
            <input type="number" value={f.price ?? 0} onChange={(e) => upd("price", Number(e.target.value))} className={inp} />
          </Field>
          <Field label="Старая цена (₽)">
            <input type="number" value={f.old_price ?? ""} onChange={(e) => upd("old_price", e.target.value === "" ? null : Number(e.target.value))} className={inp} />
          </Field>
          <Field label="Рейтинг">
            <input type="number" step="0.1" value={f.rating ?? 5} onChange={(e) => upd("rating", Number(e.target.value))} className={inp} />
          </Field>
          <Field label="Отзывы">
            <input type="number" value={f.reviews ?? 0} onChange={(e) => upd("reviews", Number(e.target.value))} className={inp} />
          </Field>
          <Field label="Продаж">
            <input type="number" value={f.sales ?? 0} onChange={(e) => upd("sales", Number(e.target.value))} className={inp} />
          </Field>
          <Field label="Бейдж">
            <select value={f.badge ?? ""} onChange={(e) => upd("badge", (e.target.value || null) as AdminProduct["badge"])} className={inp}>
              <option value="">—</option>
              <option value="HOT">HOT</option>
              <option value="NEW">NEW</option>
              <option value="-50%">-50%</option>
              <option value="ТОП">ТОП</option>
            </select>
          </Field>
          <Field label="Порядок">
            <input type="number" value={f.sort_order ?? 0} onChange={(e) => upd("sort_order", Number(e.target.value))} className={inp} />
          </Field>
          <Field label="Активен">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.is_active ?? true} onChange={(e) => upd("is_active", e.target.checked)} />
              показывать на сайте
            </label>
          </Field>
        </div>

        {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-border bg-background px-4 py-2 text-sm">Отмена</button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={"flex flex-col gap-1.5 " + (full ? "md:col-span-2" : "")}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SeoSection({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListSeo);
  const getFn = useServerFn(adminGetSeo);
  const regenFn = useServerFn(adminRegenerateSeo);
  const updateFn = useServerFn(adminUpdateSeo);
  const lockFn = useServerFn(adminToggleSeoLock);
  const bulkFn = useServerFn(adminBulkRegenerateSeo);

  const [editingId, setEditingId] = useState<string | null>(null);

  const rows = useQuery({
    queryKey: ["admin", "seo"],
    queryFn: () => listFn(),
    enabled: isAdmin,
  });

  const regenMut = useMutation({
    mutationFn: (id: string) => regenFn({ data: { productId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "seo"] }),
  });
  const lockMut = useMutation({
    mutationFn: (v: { id: string; locked: boolean }) =>
      lockFn({ data: { productId: v.id, locked: v.locked } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "seo"] }),
  });
  const bulkMut = useMutation({
    mutationFn: () => bulkFn({ data: { limit: 20 } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "seo"] }),
  });

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">AI SEO-контент</h2>
          <p className="text-xs text-muted-foreground">
            Нейросеть автоматически создаёт уникальные SEO-данные для каждой карточки.
          </p>
        </div>
        <button
          onClick={() => bulkMut.mutate()}
          disabled={bulkMut.isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {bulkMut.isPending ? "Генерация…" : "Перегенерировать 20 старейших"}
        </button>
      </div>
      {bulkMut.data && (
        <p className="mt-2 text-xs text-emerald-500">
          Готово: {bulkMut.data.ok} ок · {bulkMut.data.fail} ошибок (из {bulkMut.data.processed})
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Товар / SEO Title</th>
              <th className="p-3">Score</th>
              <th className="p-3">Сгенерировано</th>
              <th className="p-3">Lock</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.data?.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="p-3">
                  <div className="font-semibold">{r.title}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">
                    {r.seo_title || <span className="italic">— нет SEO —</span>}
                  </div>
                </td>
                <td className="p-3">
                  <span
                    className={
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold " +
                      (r.seo_score >= 80
                        ? "bg-emerald-500/15 text-emerald-500"
                        : r.seo_score >= 50
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-rose-500/15 text-rose-500")
                    }
                  >
                    {r.seo_score}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {r.seo_generated_at ? new Date(r.seo_generated_at).toLocaleString("ru-RU") : "—"}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => lockMut.mutate({ id: r.id, locked: !r.seo_locked })}
                    className={
                      "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs " +
                      (r.seo_locked
                        ? "border-amber-500/40 text-amber-500"
                        : "border-border text-muted-foreground hover:bg-muted")
                    }
                  >
                    {r.seo_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    {r.seo_locked ? "заблокирован" : "авто"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => regenMut.mutate(r.id)}
                    disabled={regenMut.isPending && regenMut.variables === r.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" /> Перегенер.
                  </button>
                  <button
                    onClick={() => setEditingId(r.id)}
                    className="ml-2 inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
            {rows.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Нет товаров
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingId && (
        <SeoEditDialog
          productId={editingId}
          getFn={getFn}
          updateFn={updateFn}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "seo"] });
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

type SeoGetFn = ReturnType<typeof useServerFn<typeof adminGetSeo>>;
type SeoUpdateFn = ReturnType<typeof useServerFn<typeof adminUpdateSeo>>;

function SeoEditDialog({
  productId,
  getFn,
  updateFn,
  onClose,
  onSaved,
}: {
  productId: string;
  getFn: SeoGetFn;
  updateFn: SeoUpdateFn;
  onClose: () => void;
  onSaved: () => void;
}) {
  const q = useQuery({
    queryKey: ["admin", "seo", productId],
    queryFn: () => getFn({ data: { productId } }),
  });
  const [f, setF] = useState<{
    seo_title: string;
    seo_description: string;
    seo_keywords: string;
    seo_h1: string;
    short_description: string;
    full_description: string;
    instructions: string;
    advantages: string;
    features: string;
    faq: string;
  } | null>(null);

  if (q.data && !f) {
    setF({
      seo_title: q.data.seo_title ?? "",
      seo_description: q.data.seo_description ?? "",
      seo_keywords: q.data.seo_keywords ?? "",
      seo_h1: q.data.seo_h1 ?? "",
      short_description: q.data.short_description ?? "",
      full_description: q.data.full_description ?? "",
      instructions: q.data.instructions ?? "",
      advantages: (Array.isArray(q.data.advantages) ? (q.data.advantages as string[]) : []).join("\n"),
      features: (Array.isArray(q.data.features) ? (q.data.features as string[]) : []).join("\n"),
      faq: JSON.stringify(
        Array.isArray(q.data.faq) ? q.data.faq : [],
        null,
        2,
      ),
    });
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!f) return;
      let faqParsed: { question: string; answer: string }[] = [];
      try {
        const j = JSON.parse(f.faq);
        if (Array.isArray(j)) faqParsed = j;
      } catch {
        throw new Error("FAQ должен быть валидным JSON-массивом [{question, answer}]");
      }
      await updateFn({
        data: {
          productId,
          seo_title: f.seo_title,
          seo_description: f.seo_description,
          seo_keywords: f.seo_keywords,
          seo_h1: f.seo_h1,
          short_description: f.short_description,
          full_description: f.full_description,
          instructions: f.instructions,
          advantages: f.advantages.split("\n").map((s) => s.trim()).filter(Boolean),
          features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
          faq: faqParsed,
        },
      });
    },
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur">
      <div className="mt-8 w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Редактирование SEO</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!f ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Загрузка…</div>
        ) : (
          <>
            <div className="mt-5 grid gap-3">
              <Field label="SEO Title" full>
                <input value={f.seo_title} onChange={(e) => setF({ ...f, seo_title: e.target.value })} className={inp} />
              </Field>
              <Field label="Meta Description" full>
                <textarea value={f.seo_description} onChange={(e) => setF({ ...f, seo_description: e.target.value })} rows={2} className={inp} />
              </Field>
              <Field label="Meta Keywords (через запятую)" full>
                <input value={f.seo_keywords} onChange={(e) => setF({ ...f, seo_keywords: e.target.value })} className={inp} />
              </Field>
              <Field label="H1" full>
                <input value={f.seo_h1} onChange={(e) => setF({ ...f, seo_h1: e.target.value })} className={inp} />
              </Field>
              <Field label="Краткое описание" full>
                <textarea value={f.short_description} onChange={(e) => setF({ ...f, short_description: e.target.value })} rows={2} className={inp} />
              </Field>
              <Field label="Полное описание" full>
                <textarea value={f.full_description} onChange={(e) => setF({ ...f, full_description: e.target.value })} rows={6} className={inp} />
              </Field>
              <Field label="Преимущества (одно на строку)" full>
                <textarea value={f.advantages} onChange={(e) => setF({ ...f, advantages: e.target.value })} rows={4} className={inp} />
              </Field>
              <Field label="Особенности (одно на строку)" full>
                <textarea value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} rows={4} className={inp} />
              </Field>
              <Field label="Инструкция" full>
                <textarea value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} rows={4} className={inp} />
              </Field>
              <Field label="FAQ (JSON: [{question, answer}])" full>
                <textarea value={f.faq} onChange={(e) => setF({ ...f, faq: e.target.value })} rows={6} className={inp + " font-mono text-xs"} />
              </Field>
            </div>
            {saveMut.error && <p className="mt-3 text-sm text-rose-500">{saveMut.error.message}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-xl border border-border bg-background px-4 py-2 text-sm">
                Отмена
              </button>
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saveMut.isPending ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}