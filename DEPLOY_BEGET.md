# Установка GamePlaza на VPS Beget (Россия) — простыми командами

Пошаговая инструкция для домена **gameplaza.site**. Все команды выполняются на VPS Beget (Ubuntu 22.04). Копируйте блоки целиком.

---

## 0. Что заказать в Beget

1. Зайдите в [cloud.beget.com](https://cloud.beget.com) → **VPS** → **Создать сервер**.
2. Параметры:
   - ОС: **Ubuntu 22.04**
   - Тариф: минимум **2 CPU / 2 ГБ RAM / 20 ГБ SSD**
   - Локация: **Москва** (или СПб)
3. После создания Beget пришлёт на почту:
   - **IP-адрес сервера**
   - **root пароль**

4. В панели Beget → **DNS** для домена `gameplaza.site` добавьте записи:
   - `A` запись: `@` → IP вашего VPS
   - `A` запись: `www` → IP вашего VPS

---

## 1. Подключение к серверу

С вашего компьютера (Windows: PowerShell; Mac/Linux: терминал):

```bash
ssh root@IP_СЕРВЕРА
```

Введите пароль из письма Beget.

---

## 2. Базовая настройка (одна команда)

Скопируйте и выполните весь блок:

```bash
apt update && apt upgrade -y && \
apt install -y curl git nginx ufw certbot python3-certbot-nginx build-essential unzip && \
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

---

## 3. Установка Node.js 20, Bun, PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
curl -fsSL https://bun.sh/install | bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
export PATH="$HOME/.bun/bin:$PATH"
npm i -g pm2
```

Проверка:
```bash
node -v && bun -v && pm2 -v
```

---

## 4. SSH-ключ для GitHub

```bash
ssh-keygen -t ed25519 -C "deploy@gameplaza.site" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Скопируйте вывод и добавьте в GitHub:
**Репозиторий → Settings → Deploy keys → Add deploy key** (поставьте галочку Allow write).

---

## 5. Клонирование проекта

```bash
mkdir -p /var/www && cd /var/www
git clone git@github.com:ВАШ_АККАУНТ/ВАШ_РЕПО.git gameplaza
cd gameplaza
```

---

## 6. Переключение сборки на Node-сервер

Откройте файл:
```bash
nano vite.config.ts
```

Внутри `tanstackStart({ ... })` добавьте `target: 'node-server'`:

```ts
tanstackStart: {
  target: 'node-server',
  server: { entry: "server" },
},
```

Сохраните (`Ctrl+O`, `Enter`, `Ctrl+X`) и установите адаптер:

```bash
bun add @tanstack/react-start-server-node
```

---

## 7. Файл `.env`

```bash
nano /var/www/gameplaza/.env
```

Вставьте:

```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
PUBLIC_SITE_URL=https://gameplaza.site

VITE_SUPABASE_URL=https://ckgikatsuqgczqugpxoc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2lrYXRzdXFnY3pxdWdweG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDczMTUsImV4cCI6MjA5NzE4MzMxNX0.IaDWjjwYenACckeElYlXg9wq-4odj8Zha1Fx0-ouDY4
VITE_SUPABASE_PROJECT_ID=ckgikatsuqgczqugpxoc
SUPABASE_URL=https://ckgikatsuqgczqugpxoc.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2lrYXRzdXFnY3pxdWdweG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDczMTUsImV4cCI6MjA5NzE4MzMxNX0.IaDWjjwYenACckeElYlXg9wq-4odj8Zha1Fx0-ouDY4

DIGISELLER_SELLER_ID=ВАШ_SELLER_ID
DIGISELLER_API_KEY=ВАШ_API_KEY
LOVABLE_API_KEY=ВАШ_LOVABLE_KEY
```

Защитите файл:
```bash
chmod 600 /var/www/gameplaza/.env
```

---

## 8. Сборка и запуск

```bash
cd /var/www/gameplaza
bun install
bun run build
pm2 start .output/server/index.mjs --name gameplaza --env-file .env -i 2
pm2 save
pm2 startup systemd -u root --hp /root
```

Проверка:
```bash
curl http://127.0.0.1:3000
pm2 logs gameplaza --lines 50
```

---

## 9. Nginx + SSL

```bash
cat > /etc/nginx/sites-available/gameplaza << 'EOF'
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
EOF

ln -sf /etc/nginx/sites-available/gameplaza /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Получите бесплатный SSL от Let's Encrypt:

```bash
certbot --nginx -d gameplaza.site -d www.gameplaza.site \
  --redirect --agree-tos -m admin@gameplaza.site --non-interactive
systemctl enable certbot.timer
```

Готово — сайт открывается по **https://gameplaza.site**.

---

## 10. Авто-деплой из GitHub

В репозитории GitHub → **Settings → Secrets and variables → Actions** добавьте:

| Имя | Значение |
|---|---|
| `SSH_HOST` | IP вашего Beget VPS |
| `SSH_USER` | `root` |
| `SSH_PORT` | `22` |
| `SSH_PRIVATE_KEY` | содержимое файла с сервера: `cat ~/.ssh/id_ed25519` |
| `SUPABASE_URL` | `https://ckgikatsuqgczqugpxoc.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | (из `.env`) |
| `SUPABASE_PROJECT_ID` | `ckgikatsuqgczqugpxoc` |
| `DIGISELLER_SELLER_ID` | ваш ID |
| `DIGISELLER_API_KEY` | ваш ключ |
| `LOVABLE_API_KEY` | ваш ключ |

Теперь после каждого `git push origin main` сайт обновится автоматически.

---

## 11. Полезные команды

```bash
pm2 status                       # статус приложения
pm2 logs gameplaza --lines 200   # логи
pm2 restart gameplaza            # перезапуск
systemctl status nginx           # статус nginx
certbot renew --dry-run          # тест продления SSL
```

Ручное обновление (если без GitHub Actions):
```bash
cd /var/www/gameplaza && git pull && bun install && bun run build && pm2 reload gameplaza
```

---

## 12. Частые проблемы на Beget

- **Сайт не открывается** — проверьте, что в DNS Beget A-записи `@` и `www` указывают на IP сервера (применение DNS до 30 мин).
- **`certbot` ошибка** — убедитесь, что порт 80 открыт (`ufw status`) и домен уже резолвится: `dig gameplaza.site +short`.
- **PM2 не стартует** — посмотрите `pm2 logs gameplaza`, обычно дело в `.env` или в `bun run build` (запустите вручную).
- **Мало памяти при сборке** — добавьте swap:
  ```bash
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```

---

После шагов 0–9 сайт **GamePlaza** работает на VPS Beget по адресу **https://gameplaza.site** с HTTPS, автоимпортом до 200 товаров в сутки и (после шага 10) автоматическим деплоем из GitHub.