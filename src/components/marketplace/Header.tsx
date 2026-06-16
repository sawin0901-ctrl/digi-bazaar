import { Link } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Menu } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white font-black shadow-lg shadow-fuchsia-500/30">D</div>
          <span className="text-lg font-bold tracking-tight">DIGIVAULT</span>
        </Link>
        <nav className="ml-6 hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/catalog" className="hover:text-foreground">Каталог</Link>
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
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-border hover:bg-muted" aria-label="Профиль"><User className="h-4 w-4" /></button>
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
    </header>
  );
}