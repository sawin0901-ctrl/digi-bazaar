import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white font-black">D</div>
            <span className="text-lg font-bold">GamePlaza</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Маркетплейс цифровых товаров №1 в Рунете. Мгновенная доставка 24/7.</p>
        </div>
        <div>
          <div className="text-sm font-semibold">Покупателям</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/catalog" className="hover:text-foreground">Каталог</Link></li>
            <li><Link to="/deals" className="hover:text-foreground">Скидки</Link></li>
            <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Компания</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/contact" className="hover:text-foreground">Контакты</Link></li>
            <li><Link to="/reviews" className="hover:text-foreground">Отзывы</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Поддержка 24/7</div>
          <p className="mt-3 text-sm text-muted-foreground">support@gameplaza.site</p>
          <p className="text-sm text-muted-foreground">Telegram: @gameplaza</p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">© 2026 GamePlaza. Все права защищены.</div>
    </footer>
  );
}