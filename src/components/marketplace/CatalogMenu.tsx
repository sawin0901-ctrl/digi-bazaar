import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Gamepad2, Gem, Smartphone, Globe, Terminal, X, Search } from "lucide-react";
import type { CategoryDTO } from "@/lib/marketplace/catalog.functions";

type Group = {
  id: string;
  label: string;
  icon: typeof Gamepad2;
  tiles: string[]; // category slugs shown as big tiles
  columns: { title: string; slugs: string[] }[];
};

const GROUPS: Group[] = [
  {
    id: "games",
    label: "Игры и игровые сервисы",
    icon: Gamepad2,
    tiles: [
      "steam-replenishment", "xbox-microsoft-store", "playstation",
      "nintendo-eshop", "minecraft", "diablo-iv",
      "dead-by-daylight", "gothic-1-remake", "forza-horizon-6",
    ],
    columns: [
      { title: "Steam", slugs: ["steam-replenishment", "minecraft", "helldivers-2"] },
      { title: "PlayStation", slugs: ["playstation", "ea-sports-fc-26", "007-first-light"] },
      { title: "Xbox", slugs: ["xbox-microsoft-store", "forza-horizon-6"] },
      { title: "Nintendo", slugs: ["nintendo-eshop"] },
      { title: "Battle.net", slugs: ["battle-net-refill", "world-of-warcraft", "overwatch-2", "diablo-iv"] },
    ],
  },
  {
    id: "ingame",
    label: "Игровые ценности",
    icon: Gem,
    tiles: ["roblox-robux", "valorant", "playerunknown-s-battlegrounds", "minecraft", "overwatch-2", "diablo-iv"],
    columns: [
      { title: "Популярное", slugs: ["roblox-robux", "valorant", "playerunknown-s-battlegrounds"] },
      { title: "Шутеры", slugs: ["valorant", "helldivers-2", "playerunknown-s-battlegrounds"] },
      { title: "MMO/RPG", slugs: ["world-of-warcraft", "diablo-iv"] },
    ],
  },
  {
    id: "mobile",
    label: "Мобильные игры и Apple",
    icon: Smartphone,
    tiles: ["app-store-itunes", "telegram-premium", "roblox-robux", "minecraft"],
    columns: [
      { title: "Apple", slugs: ["app-store-itunes"] },
      { title: "Мобильные", slugs: ["telegram-premium", "roblox-robux"] },
    ],
  },
  {
    id: "services",
    label: "Сервисы и AI",
    icon: Globe,
    tiles: ["chatgpt", "claude", "gemini", "grok-xai", "perplexity", "openrouter", "cursor", "telegram-premium"],
    columns: [
      { title: "AI", slugs: ["chatgpt", "claude", "gemini", "grok-xai", "perplexity", "openrouter"] },
      { title: "Соцсети", slugs: ["telegram-premium"] },
      { title: "Музыка/Видео", slugs: ["spotify"] },
      { title: "Коммуникации", slugs: ["zoom"] },
    ],
  },
  {
    id: "programs",
    label: "Программы",
    icon: Terminal,
    tiles: ["cursor", "zoom", "spotify"],
    columns: [
      { title: "Разработка", slugs: ["cursor"] },
      { title: "Работа", slugs: ["zoom"] },
    ],
  },
];

export function CatalogMenu({ categories, onClose }: { categories: CategoryDTO[]; onClose: () => void }) {
  const [activeId, setActiveId] = useState<string>(GROUPS[0].id);
  const [query, setQuery] = useState("");
  const byslug = new Map(categories.map((c) => [c.slug, c]));
  const active = GROUPS.find((g) => g.id === activeId) ?? GROUPS[0];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? categories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
    : [];

  const isSearching = q.length > 0;

  return (
    <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-background shadow-2xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[260px_1fr] gap-0 px-4 py-4 sm:px-6">
        {/* Left sidebar */}
        <aside className="border-r border-border pr-3">
          <ul className="flex flex-col gap-1">
            {GROUPS.map((g) => {
              const Icon = g.icon;
              const isActive = g.id === activeId;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onMouseEnter={() => { setActiveId(g.id); setQuery(""); }}
                    onFocus={() => { setActiveId(g.id); setQuery(""); }}
                    onClick={() => { setActiveId(g.id); setQuery(""); }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      isActive ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      {g.label}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-60" />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Right panel */}
        <div className="min-w-0 pl-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по категориям…"
                className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground outline-none ring-primary/30 transition placeholder:text-muted-foreground focus:border-primary focus:ring-2"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isSearching ? (
            <div className="mt-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                {filtered.length > 0 ? `Найдено: ${filtered.length}` : "Ничего не найдено"}
              </p>
              {filtered.length > 0 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
                  {filtered.map((c) => (
                    <Link
                      key={c.slug}
                      to="/catalog"
                      search={{ category: c.slug }}
                      onClick={onClose}
                      className="group flex flex-col items-center gap-2 text-center"
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted transition group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-primary/10">
                        {c.image ? (
                          <img src={c.image} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" loading="lazy" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30" />
                        )}
                      </div>
                      <span className="line-clamp-2 text-xs font-medium leading-tight">{c.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between">
                <Link
                  to="/catalog"
                  onClick={onClose}
                  className="flex items-center gap-2 text-lg font-bold hover:underline"
                >
                  {active.label} <ChevronRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Tile grid */}
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
                {active.tiles.map((slug) => {
                  const c = byslug.get(slug);
                  if (!c) return null;
                  return (
                    <Link
                      key={slug}
                      to="/catalog"
                      search={{ category: slug }}
                      onClick={onClose}
                      className="group flex flex-col items-center gap-2 text-center"
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted transition group-hover:border-fuchsia-400/60 group-hover:shadow-lg group-hover:shadow-fuchsia-500/10">
                        {c.image ? (
                          <img src={c.image} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" loading="lazy" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30" />
                        )}
                      </div>
                      <span className="line-clamp-2 text-xs font-medium leading-tight">{c.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Sub-columns */}
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 lg:grid-cols-5">
                {active.columns.map((col) => (
                  <div key={col.title}>
                    <Link
                      to="/catalog"
                      onClick={onClose}
                      className="flex items-center gap-1 text-sm font-bold hover:underline"
                    >
                      {col.title} <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {col.slugs.map((slug) => {
                        const c = byslug.get(slug);
                        if (!c) return null;
                        return (
                          <li key={slug}>
                            <Link
                              to="/catalog"
                              search={{ category: slug }}
                              onClick={onClose}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {c.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}