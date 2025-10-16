# GitHub Actions Deployment Guide / Руководство по развертыванию через GitHub Actions

This guide describes how to deploy LLM Game using GitHub Actions and GitHub Pages.

Это руководство описывает, как развернуть LLM Game используя GitHub Actions и GitHub Pages.

## 📋 Overview / Обзор

**English:**
The deployment strategy consists of two parts:
1. **Frontend (GitHub Pages)**: Static files (HTML, CSS, JavaScript) hosted on GitHub Pages
2. **Backend (External Service)**: Python WebSocket server hosted on a free service like Render, Railway, or Fly.io

**Русский:**
Стратегия развертывания состоит из двух частей:
1. **Frontend (GitHub Pages)**: Статические файлы (HTML, CSS, JavaScript) на GitHub Pages
2. **Backend (Внешний сервис)**: Python WebSocket сервер на бесплатном сервисе типа Render, Railway или Fly.io

## 🚀 Quick Start / Быстрый старт

### Step 1: Enable GitHub Pages / Шаг 1: Включить GitHub Pages

**English:**
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. The workflow will automatically deploy on push to `main` branch

**Русский:**
1. Перейдите в ваш репозиторий на GitHub
2. Нажмите **Settings** → **Pages**
3. В разделе **Source**, выберите **GitHub Actions**
4. Workflow автоматически развернет при push в ветку `main`

### Step 2: Deploy Backend Server / Шаг 2: Развернуть Backend сервер

Choose one of the following free hosting options:

Выберите один из следующих бесплатных вариантов хостинга:

#### Option A: Render.com (Recommended / Рекомендуется)

**English:**
1. Create account at [render.com](https://render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `llm-game-backend` (or any name)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server/game_server.py`
   - **Instance Type**: Free
5. Click **Create Web Service**
6. Wait for deployment (5-10 minutes)
7. Copy your service URL (e.g., `https://llm-game-backend.onrender.com`)

**Русский:**
1. Создайте аккаунт на [render.com](https://render.com)
2. Нажмите **New** → **Web Service**
3. Подключите ваш GitHub репозиторий
4. Настройте:
   - **Name**: `llm-game-backend` (или любое имя)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server/game_server.py`
   - **Instance Type**: Free
5. Нажмите **Create Web Service**
6. Дождитесь развертывания (5-10 минут)
7. Скопируйте URL вашего сервиса (например, `https://llm-game-backend.onrender.com`)

#### Option B: Railway.app

**English:**
1. Create account at [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway will auto-detect Python and deploy
5. Go to **Settings** → **Networking** → **Generate Domain**
6. Copy your deployment URL (e.g., `https://llm-game-backend.up.railway.app`)

**Русский:**
1. Создайте аккаунт на [railway.app](https://railway.app)
2. Нажмите **New Project** → **Deploy from GitHub repo**
3. Выберите ваш репозиторий
4. Railway автоматически определит Python и развернет
5. Перейдите в **Settings** → **Networking** → **Generate Domain**
6. Скопируйте URL развертывания (например, `https://llm-game-backend.up.railway.app`)

#### Option C: Fly.io

**English:**
1. Install flyctl: [installation guide](https://fly.io/docs/hands-on/install-flyctl/)
2. Login: `flyctl auth login`
3. In your project directory, run: `flyctl launch`
4. Follow prompts (it will auto-detect Python)
5. Deploy: `flyctl deploy`
6. Get URL: `flyctl status`
7. Copy your deployment URL (e.g., `https://llm-game-backend.fly.dev`)

**Русский:**
1. Установите flyctl: [руководство по установке](https://fly.io/docs/hands-on/install-flyctl/)
2. Войдите: `flyctl auth login`
3. В директории проекта выполните: `flyctl launch`
4. Следуйте подсказкам (автоматически определит Python)
5. Разверните: `flyctl deploy`
6. Получите URL: `flyctl status`
7. Скопируйте URL развертывания (например, `https://llm-game-backend.fly.dev`)

### Step 3: Configure Frontend / Шаг 3: Настроить Frontend

**English:**
1. Open `static/config.js` in your repository
2. Update the `wsUrl` to point to your backend:
   ```javascript
   window.GAME_CONFIG = {
       wsUrl: 'wss://your-backend-url.onrender.com/ws',
   };
   ```
3. Commit and push changes
4. GitHub Actions will automatically redeploy

**Русский:**
1. Откройте `static/config.js` в вашем репозитории
2. Обновите `wsUrl` на адрес вашего backend:
   ```javascript
   window.GAME_CONFIG = {
       wsUrl: 'wss://your-backend-url.onrender.com/ws',
   };
   ```
3. Закоммитьте и запушьте изменения
4. GitHub Actions автоматически передеплоит

### Step 4: Access Your Game / Шаг 4: Получить доступ к игре

**English:**
Your game will be available at:
```
https://your-username.github.io/llm_game/
```

Or if you have a custom domain:
```
https://your-custom-domain.com/
```

**Русский:**
Ваша игра будет доступна по адресу:
```
https://your-username.github.io/llm_game/
```

Или если у вас есть свой домен:
```
https://your-custom-domain.com/
```

## 🔧 Configuration / Конфигурация

### Backend Server Port / Порт Backend сервера

**English:**
If your hosting service requires a specific port (not 8080), modify `server/game_server.py`:

```python
def main():
    """Main entry point"""
    logger.info("Starting game server...")
    port = int(os.environ.get('PORT', 8080))  # Use PORT env var if available
    app = init_app()
    web.run_app(app, host='0.0.0.0', port=port)
```

**Русский:**
Если ваш хостинг требует конкретный порт (не 8080), измените `server/game_server.py`:

```python
def main():
    """Main entry point"""
    logger.info("Starting game server...")
    port = int(os.environ.get('PORT', 8080))  # Использовать PORT из переменных окружения
    app = init_app()
    web.run_app(app, host='0.0.0.0', port=port)
```

### Custom Domain / Свой домен

**English:**
To use a custom domain with GitHub Pages:
1. Go to **Settings** → **Pages**
2. Enter your custom domain
3. Follow GitHub's DNS configuration instructions
4. Enable **Enforce HTTPS**

**Русский:**
Чтобы использовать свой домен с GitHub Pages:
1. Перейдите в **Settings** → **Pages**
2. Введите ваш домен
3. Следуйте инструкциям GitHub по настройке DNS
4. Включите **Enforce HTTPS**

## 📁 Project Structure / Структура проекта

```
llm_game/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml        # GitHub Actions workflow
├── server/
│   └── game_server.py             # Backend WebSocket server
├── static/
│   ├── config.js                  # WebSocket configuration
│   ├── game.js                    # Client-side game logic
│   └── index.html                 # Game HTML page
├── requirements.txt               # Python dependencies
├── DEPLOYMENT.md                  # Production deployment guide
├── GITHUB_ACTIONS_DEPLOYMENT.md   # This file
└── README.md                      # Project README
```

## 🔍 How It Works / Как это работает

### GitHub Actions Workflow / Workflow GitHub Actions

**English:**
The `.github/workflows/deploy-pages.yml` workflow:
1. Triggers on push to `main` branch or manual dispatch
2. Copies static files to `_site` directory
3. Creates `config.js` with default configuration
4. Updates `index.html` to include configuration
5. Creates instructions page (`README.html`)
6. Uploads artifact to GitHub Pages
7. Deploys to GitHub Pages

**Русский:**
Workflow `.github/workflows/deploy-pages.yml`:
1. Запускается при push в `main` или вручную
2. Копирует статические файлы в директорию `_site`
3. Создает `config.js` с конфигурацией по умолчанию
4. Обновляет `index.html` для подключения конфигурации
5. Создает страницу с инструкциями (`README.html`)
6. Загружает артефакт в GitHub Pages
7. Разворачивает на GitHub Pages

### WebSocket Connection / WebSocket соединение

**English:**
The game uses a configurable WebSocket URL defined in `config.js`:
- **Development**: Connects to `ws://localhost:8080/ws`
- **Production**: Connects to your deployed backend server

The `game.js` file checks for `window.GAME_CONFIG.wsUrl` and uses it if available.

**Русский:**
Игра использует настраиваемый WebSocket URL из `config.js`:
- **Разработка**: Подключается к `ws://localhost:8080/ws`
- **Production**: Подключается к вашему развернутому backend серверу

Файл `game.js` проверяет `window.GAME_CONFIG.wsUrl` и использует его если доступен.

## 🧪 Testing / Тестирование

### Local Testing / Локальное тестирование

**English:**
```bash
# Start backend server
python server/game_server.py

# In another terminal, start a simple HTTP server
cd static
python -m http.server 8000

# Open browser
# http://localhost:8000
```

**Русский:**
```bash
# Запустить backend сервер
python server/game_server.py

# В другом терминале, запустить простой HTTP сервер
cd static
python -m http.server 8000

# Открыть браузер
# http://localhost:8000
```

### Verify Deployment / Проверка развертывания

**English:**
1. Go to **Actions** tab in your GitHub repository
2. Check the latest workflow run
3. Verify it completed successfully (green checkmark)
4. Visit your GitHub Pages URL
5. Open browser console (F12) and check for connection logs
6. Try playing the game with multiple browser tabs

**Русский:**
1. Перейдите на вкладку **Actions** в вашем GitHub репозитории
2. Проверьте последний запуск workflow
3. Убедитесь, что он завершился успешно (зеленая галочка)
4. Посетите ваш URL GitHub Pages
5. Откройте консоль браузера (F12) и проверьте логи подключения
6. Попробуйте поиграть в нескольких вкладках браузера

## ❗ Troubleshooting / Устранение неполадок

### Problem: GitHub Actions workflow fails / Проблема: Workflow GitHub Actions не работает

**English:**
- Check workflow logs in **Actions** tab
- Verify Pages is enabled in repository settings
- Ensure you have write permissions to the repository

**Русский:**
- Проверьте логи workflow на вкладке **Actions**
- Убедитесь, что Pages включен в настройках репозитория
- Убедитесь, что у вас есть права на запись в репозиторий

### Problem: Cannot connect to WebSocket / Проблема: Не удается подключиться к WebSocket

**English:**
- Open browser console (F12) and check for errors
- Verify `config.js` has correct backend URL
- Ensure backend server is running (check service status)
- Check if backend URL uses `wss://` (not `ws://`) for HTTPS sites

**Русский:**
- Откройте консоль браузера (F12) и проверьте ошибки
- Убедитесь, что `config.js` содержит правильный URL backend
- Убедитесь, что backend сервер запущен (проверьте статус сервиса)
- Проверьте, что URL backend использует `wss://` (не `ws://`) для HTTPS сайтов

### Problem: Backend server sleeping (Render free tier) / Проблема: Backend сервер спит (Render бесплатный тариф)

**English:**
Render free tier services sleep after 15 minutes of inactivity:
- First connection may take 30-60 seconds to wake up
- Consider upgrading to paid plan for always-on service
- Or use Railway/Fly.io which have different free tier policies

**Русский:**
Бесплатные сервисы Render засыпают после 15 минут неактивности:
- Первое подключение может занять 30-60 секунд для "пробуждения"
- Рассмотрите переход на платный план для постоянной работы
- Или используйте Railway/Fly.io с другими условиями бесплатного тарифа

### Problem: CORS errors / Проблема: Ошибки CORS

**English:**
If you see CORS errors:
- WebSocket connections typically don't have CORS issues
- If using HTTP API endpoints, add CORS headers in `game_server.py`
- Ensure backend server allows connections from your GitHub Pages domain

**Русский:**
Если видите ошибки CORS:
- WebSocket соединения обычно не имеют проблем с CORS
- Если используете HTTP API endpoints, добавьте CORS заголовки в `game_server.py`
- Убедитесь, что backend сервер разрешает подключения с вашего домена GitHub Pages

## 🔒 Security / Безопасность

**English:**
- Always use `wss://` (WebSocket Secure) for production
- Keep dependencies up to date: `pip install --upgrade -r requirements.txt`
- Monitor backend service logs for suspicious activity
- Set rate limits on backend server to prevent abuse
- Use environment variables for sensitive configuration

**Русский:**
- Всегда используйте `wss://` (WebSocket Secure) для production
- Держите зависимости актуальными: `pip install --upgrade -r requirements.txt`
- Мониторьте логи backend сервиса на подозрительную активность
- Установите rate limits на backend сервере для предотвращения злоупотреблений
- Используйте переменные окружения для чувствительной конфигурации

## 💰 Cost Comparison / Сравнение стоимости

### Free Tier Options / Бесплатные варианты

| Service | Free Tier | Limitations |
|---------|-----------|-------------|
| **GitHub Pages** | ✅ Unlimited | Static files only |
| **Render.com** | ✅ 750 hours/month | Sleeps after 15min inactivity |
| **Railway.app** | ✅ $5 credit/month | ~500 hours with 512MB RAM |
| **Fly.io** | ✅ 3 VMs × 256MB | Always-on, performance limits |

### Paid Options / Платные варианты

**English:**
- **Render**: $7/month for always-on service
- **Railway**: $5-10/month depending on usage
- **Fly.io**: Pay-as-you-go based on resources
- **DigitalOcean/Linode**: $5-6/month VPS with full control

**Русский:**
- **Render**: $7/месяц для постоянной работы
- **Railway**: $5-10/месяц в зависимости от использования
- **Fly.io**: Оплата по факту использования ресурсов
- **DigitalOcean/Linode**: $5-6/месяц VPS с полным контролем

## 📚 Additional Resources / Дополнительные ресурсы

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render Deployment Guide](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Fly.io Documentation](https://fly.io/docs/)
- [Production Deployment Guide](DEPLOYMENT.md)

## 🎮 Demo / Демо

**After setup, your game will be available at:**

**После настройки, ваша игра будет доступна по адресу:**

```
https://your-username.github.io/repository-name/
```

Example:
```
https://andchir.github.io/llm_game/
```

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
