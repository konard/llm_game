# GitHub Actions Server Deployment / Развертывание сервера через GitHub Actions

**English** | [Русский](#russian-version)

---

## English Version

This guide describes how to deploy the LLM Game Python server using GitHub Actions to various free hosting platforms.

### Overview

The repository includes a GitHub Actions workflow (`.github/workflows/deploy-server.yml`) that automatically:

1. **Tests** the Python server code on every push
2. **Validates** that dependencies can be installed
3. **Triggers** deployment to your chosen hosting platform
4. **Provides** detailed deployment instructions in the workflow summary

### Automatic Deployment Workflow

The workflow runs automatically when:
- You push changes to the `main` branch that affect:
  - `server/**` directory
  - `requirements.txt` file
  - The workflow file itself
- You manually trigger it from the Actions tab

### What the Workflow Does

#### 1. Test Job
- ✅ Sets up Python 3.11
- ✅ Installs dependencies from `requirements.txt`
- ✅ Tests that server modules import correctly
- ✅ Validates server can start successfully

#### 2. Deploy Job (Optional)
- 🚀 Triggers automatic deployment to Render.com (if configured)
- 📋 Displays deployment instructions for various platforms

#### 3. Build Info Job
- 📊 Creates a detailed summary with deployment instructions
- 🔗 Provides quick-start guides for popular platforms

### Platform Configuration Files

The repository includes configuration files for multiple platforms:

| File | Platform | Description |
|------|----------|-------------|
| `Procfile` | Heroku, Railway | Process type and start command |
| `render.yaml` | Render.com | Service configuration with auto-deploy |
| `railway.json` | Railway.app | Build and deploy configuration |
| `runtime.txt` | Heroku, Render | Python version specification |

### Deployment Options

#### Option 1: Render.com (Recommended for GitHub Actions Integration)

**Manual Setup:**
1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Render will auto-detect the configuration from `render.yaml`
5. Click **Create Web Service**
6. Wait 5-10 minutes for initial deployment
7. Copy your service URL (e.g., `https://llm-game-server.onrender.com`)

**Automatic Deployment via GitHub Actions:**
1. Create your Web Service on Render.com (follow manual setup above)
2. Go to your service **Settings** → **Deploy Hook**
3. Copy the Deploy Hook URL
4. In your GitHub repository:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: Paste the Deploy Hook URL
5. Now every push to `main` will automatically deploy to Render! 🎉

**Configuration:**
- The `render.yaml` file is pre-configured
- Free tier includes 750 hours/month
- Service sleeps after 15 minutes of inactivity (first request may take 30-60 seconds)

---

#### Option 2: Railway.app (Easiest Setup)

**Setup:**
1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway auto-detects Python using `railway.json`
5. Click **Deploy**
6. Go to **Settings** → **Networking** → **Generate Domain**
7. Copy your deployment URL (e.g., `https://llm-game-backend.up.railway.app`)

**Configuration:**
- The `railway.json` file is pre-configured
- Free tier: $5 credit per month (~500 hours with 512MB RAM)
- Auto-deploys on every push to `main` branch

---

#### Option 3: Fly.io (Best for Global Distribution)

**Setup:**
1. Install flyctl:
   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh

   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. Authenticate:
   ```bash
   flyctl auth login
   ```

3. Create and configure app:
   ```bash
   flyctl launch
   ```
   - Choose a unique app name
   - Select region closest to your users
   - Don't add PostgreSQL or Redis
   - Use defaults for everything else

4. Deploy:
   ```bash
   flyctl deploy
   ```

5. Get your URL:
   ```bash
   flyctl status
   ```

**Configuration:**
- Fly.io creates `fly.toml` automatically during `flyctl launch`
- Free tier: 3 shared VMs with 256MB RAM each
- Always-on (doesn't sleep)

---

#### Option 4: Heroku (Classic Platform)

**Setup:**
1. Install Heroku CLI:
   ```bash
   # macOS
   brew install heroku/brew/heroku

   # Ubuntu/Debian
   curl https://cli-assets.heroku.com/install.sh | sh

   # Windows
   # Download installer from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. Login and create app:
   ```bash
   heroku login
   heroku create your-game-server-name
   ```

3. Deploy:
   ```bash
   git push heroku main
   ```

4. Get your URL:
   ```bash
   heroku info
   ```

**Configuration:**
- The `Procfile` is pre-configured
- The `runtime.txt` specifies Python version
- Free tier was discontinued; starts at $5/month

---

### After Deployment

Once your server is deployed, you need to update the frontend configuration:

1. Note your server URL (e.g., `https://your-app.onrender.com`)

2. Update `static/config.js`:
   ```javascript
   window.GAME_CONFIG = {
     wsUrl: 'wss://your-app.onrender.com/ws',
   };
   ```

3. Commit and push:
   ```bash
   git add static/config.js
   git commit -m "Update server URL for production"
   git push origin main
   ```

4. GitHub Pages will automatically redeploy the frontend with the new configuration

### Environment Variables

The server supports the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port for the server to listen on | `8080` |

Most hosting platforms automatically set `PORT`. The server code in `server/game_server.py` is configured to read from this environment variable.

### Testing Your Deployment

1. **Check GitHub Actions:**
   - Go to your repository's **Actions** tab
   - Verify the "Deploy Python Server" workflow succeeded (green checkmark)
   - Read the workflow summary for deployment instructions

2. **Test Server Health:**
   ```bash
   curl https://your-server-url.com/
   ```
   Should return the game's HTML page

3. **Test WebSocket Connection:**
   - Open browser console (F12)
   - Go to your GitHub Pages URL
   - Check console for WebSocket connection logs
   - Should see "WebSocket connected" or similar

4. **Test Gameplay:**
   - Open the game in multiple browser tabs
   - Move around and shoot
   - Verify players appear in all tabs

### Troubleshooting

#### GitHub Actions Workflow Fails

**Problem:** The "Test Python Server" job fails

**Solutions:**
1. Check the workflow logs in the Actions tab
2. Verify `requirements.txt` has correct dependencies
3. Make sure `server/game_server.py` has no syntax errors
4. Test locally:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python server/game_server.py
   ```

---

#### Server Not Responding After Deployment

**Problem:** Server URL returns 404 or connection refused

**Solutions:**
1. Check hosting platform logs:
   - **Render:** Dashboard → Service → Logs tab
   - **Railway:** Dashboard → Deployment → View logs
   - **Fly.io:** `flyctl logs`
   - **Heroku:** `heroku logs --tail`

2. Verify server is running:
   - Check the platform's dashboard for service status
   - Ensure build and deploy completed successfully

3. Check PORT configuration:
   - Most platforms set `PORT` automatically
   - Verify server logs show correct port (check logs for "Server will listen on port...")

---

#### WebSocket Connection Fails

**Problem:** Frontend shows "WebSocket connection failed"

**Solutions:**
1. Verify `config.js` uses correct URL:
   - ✅ Correct: `wss://your-server.com/ws` (note the `/ws` path)
   - ❌ Wrong: `ws://your-server.com/ws` (should be `wss://` for HTTPS)
   - ❌ Wrong: `wss://your-server.com` (missing `/ws` path)

2. Check browser console for specific errors:
   - "SSL handshake failed" → Check HTTPS configuration
   - "Connection refused" → Server not running or wrong URL
   - "404 Not Found" → Missing `/ws` path

3. Test WebSocket directly:
   ```javascript
   // In browser console
   const ws = new WebSocket('wss://your-server.com/ws');
   ws.onopen = () => console.log('Connected!');
   ws.onerror = (err) => console.error('Error:', err);
   ```

---

#### Server Sleeps (Render.com Free Tier)

**Problem:** First connection takes 30-60 seconds

**This is expected behavior** on Render.com free tier:
- Service sleeps after 15 minutes of inactivity
- First request "wakes up" the service
- Subsequent requests are fast

**Solutions:**
1. Upgrade to paid plan ($7/month) for always-on service
2. Use a different platform (Fly.io, Railway) with different free tier policies
3. Accept the delay (inform users in your UI)

---

### Monitoring and Logs

#### View Real-Time Logs

**Render.com:**
```bash
# Via dashboard: Service → Logs tab (real-time)
```

**Railway.app:**
```bash
# Via dashboard: Deployment → View logs
```

**Fly.io:**
```bash
flyctl logs
```

**Heroku:**
```bash
heroku logs --tail
```

#### Check Server Health

Most platforms provide health check endpoints. You can also monitor:

```bash
# Check if server responds
curl -I https://your-server.com/

# Check WebSocket endpoint
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  https://your-server.com/ws
```

### Cost Comparison

| Platform | Free Tier | Always-On | Limitations |
|----------|-----------|-----------|-------------|
| **Render.com** | ✅ 750h/month | ❌ Sleeps after 15min | Good for demos |
| **Railway.app** | ✅ $5 credit/month | ✅ Yes | ~500 hours with 512MB |
| **Fly.io** | ✅ 3×256MB VMs | ✅ Yes | Performance limits |
| **Heroku** | ❌ No free tier | ✅ Yes | Starts at $5/month |

### Security Best Practices

1. **Use HTTPS/WSS:** Always use `wss://` (WebSocket Secure) in production
2. **Environment Variables:** Store sensitive config in platform environment variables
3. **Rate Limiting:** Consider adding rate limiting to prevent abuse
4. **Monitor Logs:** Regularly check logs for suspicious activity
5. **Keep Updated:** Update dependencies regularly:
   ```bash
   pip install --upgrade -r requirements.txt
   pip freeze > requirements.txt
   ```

### Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render Deployment Guide](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Fly.io Documentation](https://fly.io/docs/)
- [Heroku Python Guide](https://devcenter.heroku.com/articles/getting-started-with-python)

### Support

If you encounter issues:
1. Check the [GitHub Issues](https://github.com/andchir/llm_game/issues)
2. Review workflow logs in Actions tab
3. Check hosting platform logs
4. Create a new issue with:
   - Error messages from logs
   - Steps to reproduce
   - Platform you're using

---

## Russian Version

<a name="russian-version"></a>

Это руководство описывает, как развернуть Python-сервер игры LLM Game используя GitHub Actions на различных бесплатных платформах хостинга.

### Обзор

Репозиторий включает workflow GitHub Actions (`.github/workflows/deploy-server.yml`), который автоматически:

1. **Тестирует** код Python-сервера при каждом push
2. **Проверяет**, что зависимости могут быть установлены
3. **Запускает** развертывание на выбранную платформу хостинга
4. **Предоставляет** подробные инструкции по развертыванию в сводке workflow

### Автоматический Workflow Развертывания

Workflow запускается автоматически когда:
- Вы делаете push изменений в ветку `main`, которые затрагивают:
  - Директорию `server/**`
  - Файл `requirements.txt`
  - Сам файл workflow
- Вы запускаете его вручную из вкладки Actions

### Что делает Workflow

#### 1. Задача Test (Тестирование)
- ✅ Настраивает Python 3.11
- ✅ Устанавливает зависимости из `requirements.txt`
- ✅ Тестирует, что модули сервера импортируются корректно
- ✅ Проверяет, что сервер может успешно запуститься

#### 2. Задача Deploy (Развертывание, опционально)
- 🚀 Запускает автоматическое развертывание на Render.com (если настроено)
- 📋 Отображает инструкции по развертыванию для различных платформ

#### 3. Задача Build Info (Информация о сборке)
- 📊 Создает подробную сводку с инструкциями по развертыванию
- 🔗 Предоставляет руководства быстрого старта для популярных платформ

### Файлы Конфигурации Платформ

Репозиторий включает файлы конфигурации для нескольких платформ:

| Файл | Платформа | Описание |
|------|-----------|----------|
| `Procfile` | Heroku, Railway | Тип процесса и команда запуска |
| `render.yaml` | Render.com | Конфигурация сервиса с автоматическим развертыванием |
| `railway.json` | Railway.app | Конфигурация сборки и развертывания |
| `runtime.txt` | Heroku, Render | Указание версии Python |

### Варианты Развертывания

#### Вариант 1: Render.com (Рекомендуется для интеграции с GitHub Actions)

**Ручная настройка:**
1. Перейдите на [render.com](https://render.com) и войдите
2. Нажмите **New** → **Web Service**
3. Подключите ваш GitHub репозиторий
4. Render автоматически определит конфигурацию из `render.yaml`
5. Нажмите **Create Web Service**
6. Подождите 5-10 минут для начального развертывания
7. Скопируйте URL вашего сервиса (например, `https://llm-game-server.onrender.com`)

**Автоматическое развертывание через GitHub Actions:**
1. Создайте Web Service на Render.com (следуйте ручной настройке выше)
2. Перейдите в **Settings** → **Deploy Hook** вашего сервиса
3. Скопируйте Deploy Hook URL
4. В вашем GitHub репозитории:
   - Перейдите в **Settings** → **Secrets and variables** → **Actions**
   - Нажмите **New repository secret**
   - Имя: `RENDER_DEPLOY_HOOK_URL`
   - Значение: Вставьте Deploy Hook URL
5. Теперь каждый push в `main` будет автоматически разворачивать на Render! 🎉

**Конфигурация:**
- Файл `render.yaml` предварительно настроен
- Бесплатный тариф включает 750 часов/месяц
- Сервис засыпает после 15 минут неактивности (первый запрос может занять 30-60 секунд)

---

#### Вариант 2: Railway.app (Самая простая настройка)

**Настройка:**
1. Перейдите на [railway.app](https://railway.app) и войдите
2. Нажмите **New Project** → **Deploy from GitHub repo**
3. Выберите ваш репозиторий
4. Railway автоматически определяет Python используя `railway.json`
5. Нажмите **Deploy**
6. Перейдите в **Settings** → **Networking** → **Generate Domain**
7. Скопируйте URL развертывания (например, `https://llm-game-backend.up.railway.app`)

**Конфигурация:**
- Файл `railway.json` предварительно настроен
- Бесплатный тариф: $5 кредит в месяц (~500 часов с 512MB RAM)
- Автоматическое развертывание при каждом push в ветку `main`

---

#### Вариант 3: Fly.io (Лучше для глобального распространения)

**Настройка:**
1. Установите flyctl:
   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh

   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. Аутентификация:
   ```bash
   flyctl auth login
   ```

3. Создайте и настройте приложение:
   ```bash
   flyctl launch
   ```
   - Выберите уникальное имя приложения
   - Выберите регион ближайший к вашим пользователям
   - Не добавляйте PostgreSQL или Redis
   - Используйте значения по умолчанию для всего остального

4. Разверните:
   ```bash
   flyctl deploy
   ```

5. Получите ваш URL:
   ```bash
   flyctl status
   ```

**Конфигурация:**
- Fly.io создает `fly.toml` автоматически во время `flyctl launch`
- Бесплатный тариф: 3 общих VM с 256MB RAM каждая
- Всегда включен (не засыпает)

---

#### Вариант 4: Heroku (Классическая платформа)

**Настройка:**
1. Установите Heroku CLI:
   ```bash
   # macOS
   brew install heroku/brew/heroku

   # Ubuntu/Debian
   curl https://cli-assets.heroku.com/install.sh | sh

   # Windows
   # Скачайте установщик с https://devcenter.heroku.com/articles/heroku-cli
   ```

2. Войдите и создайте приложение:
   ```bash
   heroku login
   heroku create your-game-server-name
   ```

3. Разверните:
   ```bash
   git push heroku main
   ```

4. Получите ваш URL:
   ```bash
   heroku info
   ```

**Конфигурация:**
- `Procfile` предварительно настроен
- `runtime.txt` указывает версию Python
- Бесплатный тариф был отменен; начинается с $5/месяц

---

### После Развертывания

После того как ваш сервер развернут, нужно обновить конфигурацию frontend:

1. Запишите URL вашего сервера (например, `https://your-app.onrender.com`)

2. Обновите `static/config.js`:
   ```javascript
   window.GAME_CONFIG = {
     wsUrl: 'wss://your-app.onrender.com/ws',
   };
   ```

3. Закоммитьте и запушьте:
   ```bash
   git add static/config.js
   git commit -m "Update server URL for production"
   git push origin main
   ```

4. GitHub Pages автоматически передеплоит frontend с новой конфигурацией

### Переменные Окружения

Сервер поддерживает следующие переменные окружения:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт для прослушивания сервером | `8080` |

Большинство платформ хостинга автоматически устанавливают `PORT`. Код сервера в `server/game_server.py` настроен для чтения из этой переменной окружения.

### Тестирование Вашего Развертывания

1. **Проверьте GitHub Actions:**
   - Перейдите на вкладку **Actions** вашего репозитория
   - Убедитесь, что workflow "Deploy Python Server" успешен (зеленая галочка)
   - Прочитайте сводку workflow для инструкций по развертыванию

2. **Тестируйте работоспособность сервера:**
   ```bash
   curl https://your-server-url.com/
   ```
   Должна вернуться HTML страница игры

3. **Тестируйте WebSocket соединение:**
   - Откройте консоль браузера (F12)
   - Перейдите на ваш URL GitHub Pages
   - Проверьте консоль на логи WebSocket соединения
   - Должно быть видно "WebSocket connected" или подобное

4. **Тестируйте игровой процесс:**
   - Откройте игру в нескольких вкладках браузера
   - Двигайтесь и стреляйте
   - Убедитесь, что игроки появляются во всех вкладках

### Устранение Неполадок

#### Workflow GitHub Actions Падает

**Проблема:** Задача "Test Python Server" не выполняется

**Решения:**
1. Проверьте логи workflow на вкладке Actions
2. Убедитесь, что `requirements.txt` содержит правильные зависимости
3. Убедитесь, что `server/game_server.py` не содержит синтаксических ошибок
4. Тестируйте локально:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python server/game_server.py
   ```

---

#### Сервер Не Отвечает После Развертывания

**Проблема:** URL сервера возвращает 404 или отказ в соединении

**Решения:**
1. Проверьте логи платформы хостинга:
   - **Render:** Dashboard → Service → Logs tab
   - **Railway:** Dashboard → Deployment → View logs
   - **Fly.io:** `flyctl logs`
   - **Heroku:** `heroku logs --tail`

2. Убедитесь, что сервер работает:
   - Проверьте dashboard платформы на статус сервиса
   - Убедитесь, что сборка и развертывание завершились успешно

3. Проверьте конфигурацию PORT:
   - Большинство платформ устанавливают `PORT` автоматически
   - Убедитесь, что логи сервера показывают правильный порт (ищите в логах "Server will listen on port...")

---

#### WebSocket Соединение Падает

**Проблема:** Frontend показывает "WebSocket connection failed"

**Решения:**
1. Убедитесь, что `config.js` использует правильный URL:
   - ✅ Правильно: `wss://your-server.com/ws` (обратите внимание на путь `/ws`)
   - ❌ Неправильно: `ws://your-server.com/ws` (должно быть `wss://` для HTTPS)
   - ❌ Неправильно: `wss://your-server.com` (отсутствует путь `/ws`)

2. Проверьте консоль браузера на конкретные ошибки:
   - "SSL handshake failed" → Проверьте конфигурацию HTTPS
   - "Connection refused" → Сервер не работает или неправильный URL
   - "404 Not Found" → Отсутствует путь `/ws`

3. Тестируйте WebSocket напрямую:
   ```javascript
   // В консоли браузера
   const ws = new WebSocket('wss://your-server.com/ws');
   ws.onopen = () => console.log('Connected!');
   ws.onerror = (err) => console.error('Error:', err);
   ```

---

#### Сервер Засыпает (Бесплатный тариф Render.com)

**Проблема:** Первое соединение занимает 30-60 секунд

**Это ожидаемое поведение** на бесплатном тарифе Render.com:
- Сервис засыпает после 15 минут неактивности
- Первый запрос "пробуждает" сервис
- Последующие запросы быстрые

**Решения:**
1. Перейдите на платный план ($7/месяц) для постоянной работы
2. Используйте другую платформу (Fly.io, Railway) с другими условиями бесплатного тарифа
3. Примите задержку (информируйте пользователей в вашем UI)

---

### Мониторинг и Логи

#### Просмотр Логов в Реальном Времени

**Render.com:**
```bash
# Через dashboard: Service → Logs tab (real-time)
```

**Railway.app:**
```bash
# Через dashboard: Deployment → View logs
```

**Fly.io:**
```bash
flyctl logs
```

**Heroku:**
```bash
heroku logs --tail
```

#### Проверка Работоспособности Сервера

Большинство платформ предоставляют endpoints проверки работоспособности. Вы также можете мониторить:

```bash
# Проверка отвечает ли сервер
curl -I https://your-server.com/

# Проверка WebSocket endpoint
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  https://your-server.com/ws
```

### Сравнение Стоимости

| Платформа | Бесплатный тариф | Всегда включен | Ограничения |
|-----------|------------------|----------------|-------------|
| **Render.com** | ✅ 750ч/месяц | ❌ Засыпает после 15мин | Хорошо для демо |
| **Railway.app** | ✅ $5 кредит/месяц | ✅ Да | ~500 часов с 512MB |
| **Fly.io** | ✅ 3×256MB VM | ✅ Да | Ограничения производительности |
| **Heroku** | ❌ Нет бесплатного тарифа | ✅ Да | Начинается с $5/месяц |

### Лучшие Практики Безопасности

1. **Используйте HTTPS/WSS:** Всегда используйте `wss://` (WebSocket Secure) в production
2. **Переменные Окружения:** Храните чувствительную конфигурацию в переменных окружения платформы
3. **Rate Limiting:** Рассмотрите добавление rate limiting для предотвращения злоупотреблений
4. **Мониторьте Логи:** Регулярно проверяйте логи на подозрительную активность
5. **Держите Обновленным:** Обновляйте зависимости регулярно:
   ```bash
   pip install --upgrade -r requirements.txt
   pip freeze > requirements.txt
   ```

### Дополнительные Ресурсы

- [Документация GitHub Actions](https://docs.github.com/ru/actions)
- [Руководство по развертыванию Render](https://render.com/docs)
- [Документация Railway](https://docs.railway.app/)
- [Документация Fly.io](https://fly.io/docs/)
- [Руководство Heroku по Python](https://devcenter.heroku.com/articles/getting-started-with-python)

### Поддержка

Если вы столкнулись с проблемами:
1. Проверьте [GitHub Issues](https://github.com/andchir/llm_game/issues)
2. Просмотрите логи workflow на вкладке Actions
3. Проверьте логи платформы хостинга
4. Создайте новый issue с:
   - Сообщениями об ошибках из логов
   - Шагами для воспроизведения
   - Платформой, которую вы используете

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
