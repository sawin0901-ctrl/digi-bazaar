import { Link } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Menu, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { categoriesQO } from "@/lib/marketplace/queries";
import { CatalogMenu } from "./CatalogMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { RatesTicker } from "./RatesTicker";

export function Header() {
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const { data: categories } = useQuery(categoriesQO());
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!catOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setCatOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setCatOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [catOpen]);
  return (
    <header ref={wrapRef} className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <RatesTicker />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white font-black shadow-lg shadow-fuchsia-500/30">D</div>
          <span className="text-lg font-bold tracking-tight">DIGIVAULT</span>
        </Link>
        <nav className="ml-6 hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            className={`flex items-center gap-1 transition hover:text-foreground ${catOpen ? "text-foreground" : ""}`}
          >
            Каталог <ChevronDown className={`h-4 w-4 transition ${catOpen ? "rotate-180" : ""}`} />
          </button>
          <Link to="/deals" className="hover:text-foreground">Скидки</Link>
          <Link to="/reviews" className="hover:text-foreground">Отзывы</Link>
          <Link to="/faq" className="hover:text-foreground">FAQ</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Поиск товаров..." className="h-10 w-72 rounded-xl border border-border bg-muted/50 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-background" />
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-border hover:bg-muted" aria-label="Корзина"><ShoppingCart className="h-4 w-4" /></button>
          <ThemeToggle />
          <Link to="/auth" className="grid h-10 w-10 place-items-center rounded-xl border border-border hover:bg-muted" aria-label="Профиль"><User className="h-4 w-4" /></Link>
          <button onClick={() => setOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-xl border border-border md:hidden" aria-label="Меню"><Menu className="h-4 w-4" /></button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border/60 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/catalog" onClick={() => setOpen(false)}>Каталог</Link>
            <Link to="/deals" onClick={() => setOpen(false)}>Скидки</Link>
            <Link to="/reviews" onClick={() => setOpen(false)}>Отзывы</Link>
            <Link to="/faq" onClick={() => setOpen(false)}>FAQ</Link>
          </div>
        </nav>
      )}
      {catOpen && categories && <CatalogMenu categories={categories} onClose={() => setCatOpen(false)} />}
    </header>
  );
}