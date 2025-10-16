# Docker Deployment Guide / Руководство по развертыванию через Docker

**English** | [Русский](#russian-version)

---

## English Version

This guide describes how to deploy the LLM Game Python server using Docker and GitHub Container Registry.

### Overview

The repository now includes Docker support with automated builds via GitHub Actions:

1. **Dockerfile** - Containerizes the Python server
2. **GitHub Actions Workflow** - Automatically builds and pushes Docker images to GitHub Container Registry (GHCR)
3. **Multi-platform Deployment** - Deploy the container to any platform that supports Docker

### How It Works

Every time you push code to the `main` branch (or manually trigger the workflow), GitHub Actions will:

1. ✅ Test the Python server code
2. 🐳 Build a Docker container image
3. 📦 Push the image to GitHub Container Registry at `ghcr.io/[owner]/llm_game`
4. 🚀 Optionally trigger deployment to configured platforms

### Docker Image Details

- **Registry**: GitHub Container Registry (ghcr.io)
- **Image Name**: `ghcr.io/[owner]/llm_game`
- **Tags**:
  - `latest` - Latest build from main branch
  - `main` - Latest build from main branch
  - `issue-*` - Builds from issue branches (for testing)
- **Base Image**: Python 3.11-slim
- **Exposed Port**: 8080 (configurable via `PORT` environment variable)

### Deployment Options

#### Option 1: Run Locally with Docker

Perfect for local development and testing:

```bash
# Pull the latest image
docker pull ghcr.io/[owner]/llm_game:latest

# Run the server (accessible at http://localhost:8080)
docker run -p 8080:8080 ghcr.io/[owner]/llm_game:latest

# Run with custom port
docker run -p 3000:3000 -e PORT=3000 ghcr.io/[owner]/llm_game:latest

# Run in background
docker run -d -p 8080:8080 --name game-server ghcr.io/[owner]/llm_game:latest

# View logs
docker logs game-server

# Stop server
docker stop game-server
```

#### Option 2: Deploy to Render.com

Render.com supports deploying from container registries:

1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Web Service**
3. Select **Deploy an existing image from a registry**
4. Configure:
   - **Image URL**: `ghcr.io/[owner]/llm_game:latest`
   - **Port**: `8080`
   - **Region**: Choose closest to your users
5. Click **Create Web Service**

**Auto-deploy on new images:**
- Render can watch for new image tags and auto-deploy
- Or use the Deploy Hook in GitHub Actions (already configured in workflow)

#### Option 3: Deploy to Railway.app

Railway has excellent Docker support:

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project**
3. Select **Deploy from Docker Registry**
4. Configure:
   - **Registry**: `ghcr.io`
   - **Image**: `[owner]/llm_game`
   - **Tag**: `latest`
5. Railway will automatically deploy and generate a public URL

**Auto-deploy:**
- Enable "Watch for changes" to auto-deploy when new images are pushed

#### Option 4: Deploy to Fly.io

Fly.io can deploy Docker images directly:

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Create fly.toml (one-time setup)
cat > fly.toml <<EOF
app = "llm-game-server"

[build]
  image = "ghcr.io/[owner]/llm_game:latest"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
EOF

# Deploy
flyctl launch --image ghcr.io/[owner]/llm_game:latest
flyctl deploy

# Get URL
flyctl status
```

#### Option 5: Deploy to Any Cloud Provider

The Docker image works with any platform that supports containers:

**Amazon ECS/Fargate:**
```bash
# Push to ECR (optional, or use GHCR directly)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [account].dkr.ecr.us-east-1.amazonaws.com
docker tag ghcr.io/[owner]/llm_game:latest [account].dkr.ecr.us-east-1.amazonaws.com/llm-game:latest
docker push [account].dkr.ecr.us-east-1.amazonaws.com/llm-game:latest

# Create ECS service using this image
```

**Google Cloud Run:**
```bash
# Deploy directly from GHCR
gcloud run deploy llm-game \
  --image ghcr.io/[owner]/llm_game:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

**Azure Container Instances:**
```bash
az container create \
  --resource-group myResourceGroup \
  --name llm-game \
  --image ghcr.io/[owner]/llm_game:latest \
  --ports 8080 \
  --dns-name-label llm-game \
  --location eastus
```

**DigitalOcean App Platform:**
- Use "Deploy from Container Registry" option
- Image: `ghcr.io/[owner]/llm_game:latest`
- Port: 8080

### Building Custom Images

If you need to customize the Docker image:

```bash
# Clone the repository
git clone https://github.com/[owner]/llm_game.git
cd llm_game

# Build locally
docker build -t llm-game:custom .

# Run custom build
docker run -p 8080:8080 llm-game:custom

# Push to your own registry (optional)
docker tag llm-game:custom myregistry.com/llm-game:custom
docker push myregistry.com/llm-game:custom
```

### Environment Variables

The Docker container supports the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the server listens on | `8080` |

Example:
```bash
docker run -p 9000:9000 -e PORT=9000 ghcr.io/[owner]/llm_game:latest
```

### Docker Compose

For local development with Docker Compose:

```yaml
version: '3.8'

services:
  game-server:
    image: ghcr.io/[owner]/llm_game:latest
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
    restart: unless-stopped
```

Save as `docker-compose.yml` and run:
```bash
docker-compose up -d
```

### Troubleshooting

#### Image Pull Fails

**Problem:** `Error response from daemon: pull access denied`

**Solution:**
- GitHub Container Registry images are public by default, but you might need to authenticate:
  ```bash
  echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
  ```

#### Container Exits Immediately

**Problem:** Container starts but exits right away

**Solution:**
1. Check logs:
   ```bash
   docker logs [container-id]
   ```
2. Ensure port is not already in use
3. Try running in foreground to see errors:
   ```bash
   docker run -it -p 8080:8080 ghcr.io/[owner]/llm_game:latest
   ```

#### Port Already in Use

**Problem:** `bind: address already in use`

**Solution:**
- Use a different host port:
  ```bash
  docker run -p 8081:8080 ghcr.io/[owner]/llm_game:latest
  ```
- Or stop the conflicting process:
  ```bash
  lsof -i :8080
  kill [PID]
  ```

#### WebSocket Connection Fails

**Problem:** Frontend can't connect to WebSocket

**Solution:**
1. Verify container is running:
   ```bash
   docker ps
   ```
2. Check if port mapping is correct:
   ```bash
   docker port [container-id]
   ```
3. Update `static/config.js` with correct WebSocket URL:
   ```javascript
   window.GAME_CONFIG = {
     wsUrl: 'ws://localhost:8080/ws',  // For local
     // wsUrl: 'wss://your-server.com/ws',  // For production
   };
   ```

### Performance and Scaling

#### Resource Limits

Set resource limits for production:

```bash
docker run -d \
  --memory="512m" \
  --cpus="1.0" \
  -p 8080:8080 \
  ghcr.io/[owner]/llm_game:latest
```

#### Health Checks

Add health checks for better reliability:

```bash
docker run -d \
  --health-cmd="curl -f http://localhost:8080/ || exit 1" \
  --health-interval=30s \
  --health-timeout=3s \
  --health-retries=3 \
  -p 8080:8080 \
  ghcr.io/[owner]/llm_game:latest
```

#### Load Balancing

For high traffic, run multiple instances behind a load balancer (Nginx, HAProxy, etc.).

### Security Best Practices

1. **Keep Images Updated**: Pull latest images regularly
   ```bash
   docker pull ghcr.io/[owner]/llm_game:latest
   ```

2. **Use Non-Root User**: The Dockerfile already uses best practices

3. **Network Isolation**: Use Docker networks for internal communication
   ```bash
   docker network create game-network
   docker run --network game-network -p 8080:8080 ghcr.io/[owner]/llm_game:latest
   ```

4. **Secrets Management**: Use Docker secrets or environment variables for sensitive data

5. **HTTPS/WSS**: Always use HTTPS and WSS in production (handle at reverse proxy or platform level)

### Monitoring

Monitor your container:

```bash
# Real-time stats
docker stats [container-id]

# Inspect container
docker inspect [container-id]

# Follow logs
docker logs -f [container-id]
```

### GitHub Actions Integration

The workflow automatically:
- Builds images on every push to main
- Tags images with branch names and commit SHAs
- Caches layers for faster builds
- Publishes to GitHub Container Registry

You can manually trigger builds:
1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Deploy Python Server** workflow
4. Click **Run workflow**

---

## Russian Version

<a name="russian-version"></a>

Это руководство описывает, как развернуть Python-сервер игры LLM Game используя Docker и GitHub Container Registry.

### Обзор

Репозиторий теперь включает поддержку Docker с автоматическими сборками через GitHub Actions:

1. **Dockerfile** - Контейнеризирует Python сервер
2. **GitHub Actions Workflow** - Автоматически собирает и публикует Docker образы в GitHub Container Registry (GHCR)
3. **Мультиплатформенное развертывание** - Разверните контейнер на любой платформе, поддерживающей Docker

### Как это работает

Каждый раз, когда вы делаете push кода в ветку `main` (или вручную запускаете workflow), GitHub Actions будет:

1. ✅ Тестировать код Python сервера
2. 🐳 Собирать Docker образ контейнера
3. 📦 Публиковать образ в GitHub Container Registry по адресу `ghcr.io/[owner]/llm_game`
4. 🚀 Опционально запускать развертывание на настроенных платформах

### Детали Docker образа

- **Реестр**: GitHub Container Registry (ghcr.io)
- **Имя образа**: `ghcr.io/[owner]/llm_game`
- **Теги**:
  - `latest` - Последняя сборка из ветки main
  - `main` - Последняя сборка из ветки main
  - `issue-*` - Сборки из веток issue (для тестирования)
- **Базовый образ**: Python 3.11-slim
- **Открытый порт**: 8080 (настраивается через переменную окружения `PORT`)

### Варианты развертывания

#### Вариант 1: Запуск локально с Docker

Отлично для локальной разработки и тестирования:

```bash
# Загрузить последний образ
docker pull ghcr.io/[owner]/llm_game:latest

# Запустить сервер (доступен на http://localhost:8080)
docker run -p 8080:8080 ghcr.io/[owner]/llm_game:latest

# Запустить с пользовательским портом
docker run -p 3000:3000 -e PORT=3000 ghcr.io/[owner]/llm_game:latest

# Запустить в фоновом режиме
docker run -d -p 8080:8080 --name game-server ghcr.io/[owner]/llm_game:latest

# Посмотреть логи
docker logs game-server

# Остановить сервер
docker stop game-server
```

#### Вариант 2: Развертывание на Render.com

Render.com поддерживает развертывание из реестров контейнеров:

1. Перейдите на [render.com](https://render.com) и войдите
2. Нажмите **New** → **Web Service**
3. Выберите **Deploy an existing image from a registry**
4. Настройте:
   - **Image URL**: `ghcr.io/[owner]/llm_game:latest`
   - **Port**: `8080`
   - **Region**: Выберите ближайший к вашим пользователям
5. Нажмите **Create Web Service**

**Автоматическое развертывание при новых образах:**
- Render может отслеживать новые теги образов и автоматически разворачивать
- Или используйте Deploy Hook в GitHub Actions (уже настроен в workflow)

#### Вариант 3: Развертывание на Railway.app

Railway отлично поддерживает Docker:

1. Перейдите на [railway.app](https://railway.app) и войдите
2. Нажмите **New Project**
3. Выберите **Deploy from Docker Registry**
4. Настройте:
   - **Registry**: `ghcr.io`
   - **Image**: `[owner]/llm_game`
   - **Tag**: `latest`
5. Railway автоматически развернет и сгенерирует публичный URL

**Автоматическое развертывание:**
- Включите "Watch for changes" для автоматического развертывания при публикации новых образов

#### Вариант 4: Развертывание на Fly.io

Fly.io может разворачивать Docker образы напрямую:

```bash
# Установить flyctl
curl -L https://fly.io/install.sh | sh

# Войти
flyctl auth login

# Создать fly.toml (одноразовая настройка)
cat > fly.toml <<EOF
app = "llm-game-server"

[build]
  image = "ghcr.io/[owner]/llm_game:latest"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
EOF

# Развернуть
flyctl launch --image ghcr.io/[owner]/llm_game:latest
flyctl deploy

# Получить URL
flyctl status
```

#### Вариант 5: Развертывание на любом облачном провайдере

Docker образ работает с любой платформой, поддерживающей контейнеры:

**Amazon ECS/Fargate, Google Cloud Run, Azure Container Instances, DigitalOcean App Platform** - См. английскую версию для примеров команд.

### Сборка пользовательских образов

Если вам нужно настроить Docker образ:

```bash
# Клонировать репозиторий
git clone https://github.com/[owner]/llm_game.git
cd llm_game

# Собрать локально
docker build -t llm-game:custom .

# Запустить пользовательскую сборку
docker run -p 8080:8080 llm-game:custom
```

### Переменные окружения

Docker контейнер поддерживает следующие переменные окружения:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт для прослушивания сервером | `8080` |

### Устранение неполадок

См. английскую версию для подробных инструкций по устранению неполадок.

### Интеграция с GitHub Actions

Workflow автоматически:
- Собирает образы при каждом push в main
- Помечает образы именами веток и SHA коммитов
- Кеширует слои для более быстрых сборок
- Публикует в GitHub Container Registry

Вы можете вручную запустить сборки:
1. Перейдите в ваш репозиторий на GitHub
2. Нажмите вкладку **Actions**
3. Выберите workflow **Deploy Python Server**
4. Нажмите **Run workflow**

---

### Additional Resources / Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [GitHub Container Registry Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### Support / Поддержка

If you encounter issues / Если вы столкнулись с проблемами:
1. Check the [GitHub Issues](https://github.com/andchir/llm_game/issues)
2. Review Docker logs: `docker logs [container-id]`
3. Check GitHub Actions workflow logs
4. Create a new issue with error details
