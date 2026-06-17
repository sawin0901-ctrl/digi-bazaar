UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80&auto=format&fit=crop' WHERE slug = 'games';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80&auto=format&fit=crop' WHERE slug = 'subs';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1556742400-b5b7c5121f8a?w=800&q=80&auto=format&fit=crop' WHERE slug = 'cards';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&q=80&auto=format&fit=crop' WHERE slug = 'software';

INSERT INTO public.categories (slug, name, description, image, sort_order) VALUES
  ('playstation', 'PlayStation', 'PS Plus, игры, подписки', 'https://images.unsplash.com/photo-1606318313846-f6f6c30e0d50?w=800&q=80&auto=format&fit=crop', 5),
  ('xbox', 'Xbox', 'Game Pass, ключи Xbox', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&q=80&auto=format&fit=crop', 6),
  ('nintendo', 'Nintendo', 'eShop, Switch Online', 'https://images.unsplash.com/photo-1612036782180-6f0822045d23?w=800&q=80&auto=format&fit=crop', 7),
  ('roblox', 'Roblox', 'Robux, подарочные карты', 'https://images.unsplash.com/photo-1640955014216-75201056c829?w=800&q=80&auto=format&fit=crop', 8),
  ('apple', 'Apple', 'App Store, iTunes, iCloud+', 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80&auto=format&fit=crop', 9),
  ('mobile', 'Мобильные игры', 'Пополнения и донат', 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=800&q=80&auto=format&fit=crop', 10),
  ('music', 'Музыка', 'Spotify, Яндекс Музыка, Tidal', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80&auto=format&fit=crop', 11),
  ('vpn', 'VPN и безопасность', 'NordVPN, ExpressVPN, антивирусы', 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&q=80&auto=format&fit=crop', 12)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image = EXCLUDED.image,
  sort_order = EXCLUDED.sort_order;