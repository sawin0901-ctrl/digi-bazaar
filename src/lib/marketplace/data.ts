export type Category = {
  slug: string;
  name: string;
  description: string;
  image: string;
  count: number;
};

export type Product = {
  slug: string;
  title: string;
  category: string;
  seller: string;
  sellerRating: number;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  sales: number;
  image: string;
  badge?: "HOT" | "NEW" | "-50%" | "ТОП";
  description: string;
  detailsUrl?: string;
  buyUrl?: string;
  digisellerId?: string;
  variants?: string[];
  variantLabel?: string;
};

import cards from "@/assets/cat-cards.jpg";
import games from "@/assets/cat-games.jpg";
import software from "@/assets/cat-software.jpg";
import subs from "@/assets/cat-subs.jpg";
import p1 from "@/assets/p1.jpg";
import p2 from "@/assets/p2.jpg";
import p3 from "@/assets/p3.jpg";
import p4 from "@/assets/p4.jpg";
import p5 from "@/assets/p5.jpg";
import p6 from "@/assets/p6.jpg";
import p7 from "@/assets/p7.jpg";
import p8 from "@/assets/p8.jpg";

export const categories: Category[] = [
  { slug: "games", name: "Игры и ключи", description: "Steam, Epic, Xbox, PlayStation", image: games, count: 7421 },
  { slug: "subs", name: "Подписки", description: "Netflix, Spotify, YouTube Premium", image: subs, count: 1893 },
  { slug: "cards", name: "Карты пополнения", description: "Apple, Google Play, Steam Wallet", image: cards, count: 2104 },
  { slug: "software", name: "Софт и лицензии", description: "Windows, Office, антивирусы", image: software, count: 1567 },
];

export const products: Product[] = [
  { slug: "cyberlight-2099", title: "CyberLight 2099 — Steam Key (Global)", category: "games", seller: "DigiKing", sellerRating: 4.96, price: 1290, oldPrice: 2490, rating: 4.9, reviews: 2841, sales: 12480, image: p1, badge: "HOT", description: "Активация в Steam. Регион: Global. Мгновенная доставка ключа после оплаты." },
  { slug: "netflix-premium-12m", title: "Netflix Premium • 12 месяцев", category: "subs", seller: "StreamHub", sellerRating: 4.93, price: 3490, oldPrice: 5990, rating: 4.8, reviews: 1721, sales: 8420, image: p2, badge: "-50%", description: "Личный профиль Netflix Premium на 12 месяцев. 4K UHD, без рекламы." },
  { slug: "office-365-family", title: "Microsoft 365 Family — лицензия 1 год", category: "software", seller: "SoftPro", sellerRating: 4.91, price: 2190, rating: 4.9, reviews: 942, sales: 5310, image: p3, badge: "ТОП", description: "Официальная лицензия Microsoft 365 Family на 6 человек, 1 год." },
  { slug: "steam-wallet-1000", title: "Steam Wallet — пополнение 1000₽", category: "cards", seller: "WalletGo", sellerRating: 4.97, price: 1050, rating: 5.0, reviews: 4310, sales: 21900, image: p4, description: "Код пополнения кошелька Steam. Регион: Россия." },
  { slug: "spotify-premium-6m", title: "Spotify Premium • 6 месяцев", category: "subs", seller: "StreamHub", sellerRating: 4.93, price: 1490, oldPrice: 2490, rating: 4.8, reviews: 1102, sales: 6720, image: p5, badge: "NEW", description: "Личный аккаунт Spotify Premium на 6 месяцев." },
  { slug: "windows-11-pro", title: "Windows 11 Pro — лицензионный ключ", category: "software", seller: "SoftPro", sellerRating: 4.91, price: 1990, oldPrice: 3490, rating: 4.7, reviews: 2210, sales: 9840, image: p6, badge: "HOT", description: "Лицензионный ключ Windows 11 Pro. Привязка к учётной записи Microsoft." },
  { slug: "elden-saga-key", title: "Elden Saga: Eternal — Steam Key", category: "games", seller: "DigiKing", sellerRating: 4.96, price: 2890, oldPrice: 4490, rating: 4.9, reviews: 3210, sales: 11240, image: p7, badge: "ТОП", description: "Ключ активации в Steam. Регион: Global. AAA-проект года." },
  { slug: "apple-gift-2000", title: "Apple Gift Card — 2000₽", category: "cards", seller: "WalletGo", sellerRating: 4.97, price: 2050, rating: 4.9, reviews: 1840, sales: 7320, image: p8, description: "Подарочная карта Apple для App Store, iTunes, iCloud." },
  {
    slug: "apple-itunes-usa-giftcard",
    title: "Apple iTunes Gift Card (USA) — от 2$ до 1000$ • Мгновенная доставка",
    category: "cards",
    seller: "iTunes USA Store",
    sellerRating: 4.98,
    price: 153,
    rating: 4.9,
    reviews: 2601,
    sales: 382375,
    image: "https://digiseller.mycdn.ink/imgwebp.ashx?idp=10433852&dc=833761589&w=576",
    badge: "ТОП",
    description:
      "Официальная подарочная карта Apple iTunes для аккаунтов App Store, зарегистрированных в США. Большой выбор номиналов от 2$ до 1000$ — пополните Apple ID и оплачивайте приложения, игры, музыку, фильмы и подписки в App Store, iTunes и Apple Music. Карты приобретаются только в авторизованных точках продаж Apple — легальное происхождение и полная гарантия активации. Доставка кода происходит автоматически 24/7 сразу после оплаты. В случае проблем с кодом по нашей вине — гарантированный возврат или замена. Продавец работает с 2008 года и входит в топ‑10 по продажам подарочных карт iTunes USA на площадке.",
    detailsUrl: "https://plati.market/itm/672298?ai=1022102",
    buyUrl: "https://www.oplata.info/asp2/pay_wm.asp?id_d=672298&ai=1022102&_ow=0",
    digisellerId: "672298",
    variantLabel: "Сумма на карте (моментальная доставка)",
    variants: [
      "2$ (USD)","3$ (USD)","4$ (USD)","5$ (USD)","6$ (USD)","7$ (USD)","8$ (USD)","9$ (USD)","10$ (USD)",
      "15$ (USD)","20$ (USD)","25$ (USD)","30$ (USD)","40$ (USD)","50$ (USD)","60$ (USD)","70$ (USD)","80$ (USD)","90$ (USD)",
      "100$ (USD)","150$ (USD)","200$ (USD)","250$ (USD)","300$ (USD)","400$ (USD)","500$ (USD)","600$ (USD)","800$ (USD)","1000$ (USD)"
    ],
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}