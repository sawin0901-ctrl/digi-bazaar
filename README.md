# GamePlaza — установка на свой сервер через GitHub

Полная инструкция по разворачиванию проекта **GamePlaza** на собственном VPS с доменом **gameplaza.site**, с автоматическим деплоем из GitHub.

---

## 1. Требования к серверу

- Ubuntu 22.04+ (или Debian 12)
- 2 vCPU, 2 GB RAM, 20 GB SSD (минимум)
- Открыты порты: **22** (SSH), **80** (HTTP), **443** (HTTPS)
- Домен `gameplaza.site` с A-записями `@` и `www`, указывающими на IP сервера

---

## 2. Первичная подготовка сервера

```bash
ssh root@IP_СЕРВЕРА
apt update && apt upgrade -y
apt install -y curl git nginx ufw certbot python3-certbot-nginx build-essential unzip
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## 3. Установка Node.js 20, Bun и PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
curl -fsSL https://bun.sh/install | bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
export PATH="$HOME/.bun/bin:$PATH"
npm i -g pm2
```

Проверка: `node -v`, `bun -v`, `pm2 -v`.

---

## 4. SSH-ключ и клонирование репозитория

На сервере создайте ключ для деплоя:

```bash
ssh-keygen -t ed25519 -C "deploy@gameplaza.site" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Добавьте этот **публичный** ключ в GitHub:
**Репозиторий → Settings → Deploy keys → Add deploy key** (Allow write при необходимости).

Клонируйте репозиторий:

```bash
mkdir -p /var/www
cd /var/www
git clone git@github.com:ВАШ_АККАУНТ/ВАШ_РЕПО.git gameplaza
cd gameplaza
```

---

## 5. Переключение сборки на Node-сервер

В `vite.config.ts` замените preset `cloudflare-module` на `node-server`:

```ts
tanstackStart({
  customViteReactPlugin: true,
  target: 'node-server',
})
```

Установите серверный адаптер:

```bash
bun add @tanstack/react-start-server-node
bun install
```

---

## 6. Файл `.env`

`/var/www/gameplaza/.env`:

```env
# Lovable Cloud (бэкенд)
VITE_SUPABASE_URL=https://ckgikatsuqgczqugpxoc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2lrYXRzdXFnY3pxdWdweG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDczMTUsImV4cCI6MjA5NzE4MzMxNX0.IaDWjjwYenACckeElYlXg9wq-4odj8Zha1Fx0-ouDY4
VITE_SUPABASE_PROJECT_ID=ckgikatsuqgczqugpxoc

# Digiseller
DIGISELLER_SELLER_ID=ВАШ_SELLER_ID
DIGISELLER_API_KEY=ВАШ_API_KEY

# Lovable AI (авто-SEO)
LOVABLE_API_KEY=ВАШ_LOVABLE_API_KEY

# Runtime
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
PUBLIC_SITE_URL=https://gameplaza.site
```

```bash
chmod 600 /var/www/gameplaza/.env
```

---

## 7. Сборка и запуск через PM2

```bash
cd /var/www/gameplaza
bun install
bun run build
set -a; . ./.env; set +a
pm2 start scripts/node-server.mjs --name gameplaza --interpreter node -i 1 --update-env
pm2 save
pm2 startup systemd -u root --hp /root
```

Проверка: `curl http://127.0.0.1:3000` и `pm2 logs gameplaza`.

---

## 8. Nginx и SSL для gameplaza.site

`/etc/nginx/sites-available/gameplaza`:

```nginx
server {
    listen 80;
    server_name gameplaza.site www.gameplaza.site;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/gameplaza /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d gameplaza.site -d www.gameplaza.site --redirect --agree-tos -m admin@gameplaza.site --non-interactive
systemctl enable certbot.timer
```

---

## 9. Авто-деплой через GitHub Actions

В репозитории уже есть `.github/workflows/deploy.yml`. Добавьте секреты:
**Settings → Secrets and variables → Actions → New repository secret**

| Секрет | Значение |
|---|---|
| `SSH_HOST` | IP сервера |
| `SSH_USER` | `root` |
| `SSH_PORT` | `22` |
| `SSH_PRIVATE_KEY` | содержимое `~/.ssh/id_ed25519` (приватный ключ с сервера) |
| `SUPABASE_URL` | `https://ckgikatsuqgczqugpxoc.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | (см. `.env`) |
| `SUPABASE_PROJECT_ID` | `ckgikatsuqgczqugpxoc` |
| `DIGISELLER_SELLER_ID` | ваш ID |
| `DIGISELLER_API_KEY` | ваш ключ |
| `LOVABLE_API_KEY` | ваш ключ |

После `git push origin main` workflow:
1. подключится к серверу по SSH,
2. выполнит `git pull`, `bun install`, `bun run build`,
3. перезапустит процесс PM2 `gameplaza`.

---

## 10. Настройки проекта под домен gameplaza.site

1. **`src/routes/sitemap[.]xml.ts`** — `BASE_URL = 'https://gameplaza.site'`.
2. **`public/robots.txt`** — `Sitemap: https://gameplaza.site/sitemap.xml`.
3. **Cron автоимпорта** — URL обработчика очереди:
   `https://gameplaza.site/api/public/hooks/process-import-queue`
4. **Auth → URL Configuration** в Lovable Cloud:
   - Site URL: `https://gameplaza.site`
   - Redirect URLs: `https://gameplaza.site/**`

---

## 11. Ручное обновление

```bash
cd /var/www/gameplaza
git pull
bun install
bun run build
pm2 reload gameplaza
```

---

## 12. Полезные команды

```bash
pm2 status
pm2 logs gameplaza --lines 200
pm2 restart gameplaza
systemctl status nginx
certbot renew --dry-run
```

---

После шагов 1–10 сайт **GamePlaza** доступен на **https://gameplaza.site** с автоматическим деплоем из GitHub, автоимпортом до 200 товаров в сутки и внутренней перелинковкой.
