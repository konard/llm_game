# Deployment Guide / Руководство по развертыванию

This guide describes how to deploy LLM Game on a production Ubuntu server using systemd.

Это руководство описывает, как развернуть LLM Game на production Ubuntu сервере используя systemd.

## Prerequisites / Предварительные требования

**English:**
- Ubuntu 20.04 LTS or newer
- Python 3.7 or newer
- Root or sudo access
- Domain name configured (optional, for reverse proxy)
- Open port 8080 or configured reverse proxy (nginx/apache)

**Русский:**
- Ubuntu 20.04 LTS или новее
- Python 3.7 или новее
- Root или sudo доступ
- Настроенное доменное имя (опционально, для reverse proxy)
- Открытый порт 8080 или настроенный reverse proxy (nginx/apache)

## Installation Steps / Шаги установки

### 1. Update System / Обновление системы

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Dependencies / Установка зависимостей

```bash
# Install Python 3 and pip
sudo apt install -y python3 python3-pip python3-venv git

# Install optional tools
sudo apt install -y ufw nginx certbot python3-certbot-nginx
```

### 3. Create Application Directory / Создание директории приложения

```bash
# Create directory
sudo mkdir -p /opt/llm_game
sudo chown $USER:$USER /opt/llm_game
cd /opt/llm_game
```

### 4. Clone Repository / Клонирование репозитория

```bash
# Clone the repository
git clone https://github.com/andchir/llm_game.git .

# Or if you already have the code, copy it to /opt/llm_game
```

### 5. Setup Python Virtual Environment / Настройка виртуального окружения Python

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Deactivate virtual environment
deactivate
```

### 6. Configure Firewall / Настройка файрвола

```bash
# Allow SSH (important!)
sudo ufw allow OpenSSH

# Allow port 8080 for the game server
sudo ufw allow 8080/tcp

# If using nginx as reverse proxy, allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable
```

### 7. Install systemd Service / Установка systemd сервиса

```bash
# Copy service file to systemd directory
sudo cp llm_game.service /etc/systemd/system/

# Set correct ownership for application directory
sudo chown -R www-data:www-data /opt/llm_game

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable llm_game.service

# Start the service
sudo systemctl start llm_game.service
```

### 8. Verify Service Status / Проверка статуса сервиса

```bash
# Check service status
sudo systemctl status llm_game.service

# View logs
sudo journalctl -u llm_game.service -f

# Check if the service is listening
ss -tlnp | grep 8080
```

## Service Management / Управление сервисом

### Start / Запуск
```bash
sudo systemctl start llm_game.service
```

### Stop / Остановка
```bash
sudo systemctl stop llm_game.service
```

### Restart / Перезапуск
```bash
sudo systemctl restart llm_game.service
```

### Enable on boot / Включить автозапуск
```bash
sudo systemctl enable llm_game.service
```

### Disable on boot / Отключить автозапуск
```bash
sudo systemctl disable llm_game.service
```

### View logs / Просмотр логов
```bash
# Real-time logs
sudo journalctl -u llm_game.service -f

# Last 100 lines
sudo journalctl -u llm_game.service -n 100

# Logs from today
sudo journalctl -u llm_game.service --since today
```

## Optional: Nginx Reverse Proxy / Опционально: Nginx Reverse Proxy

### 1. Install Nginx / Установка Nginx

```bash
sudo apt install -y nginx
```

### 2. Create Nginx Configuration / Создание конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/llm_game
```

**Paste this configuration / Вставьте эту конфигурацию:**

```nginx
upstream llm_game_backend {
    server 127.0.0.1:8080;
}

server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Redirect HTTP to HTTPS (after SSL is configured)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://llm_game_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location /ws {
        proxy_pass http://llm_game_backend/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    location /static/ {
        proxy_pass http://llm_game_backend/static/;
        proxy_set_header Host $host;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Enable Nginx Site / Включение сайта в Nginx

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/llm_game /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 4. Optional: Setup SSL with Let's Encrypt / Опционально: Настройка SSL с Let's Encrypt

```bash
# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure nginx for HTTPS
# Follow the prompts to complete setup
```

## Updating the Application / Обновление приложения

```bash
# Stop the service
sudo systemctl stop llm_game.service

# Navigate to application directory
cd /opt/llm_game

# Pull latest changes
sudo -u www-data git pull

# Activate virtual environment and update dependencies
sudo -u www-data venv/bin/pip install -r requirements.txt --upgrade

# Start the service
sudo systemctl start llm_game.service

# Verify status
sudo systemctl status llm_game.service
```

## Troubleshooting / Устранение неполадок

### Service won't start / Сервис не запускается

```bash
# Check detailed logs
sudo journalctl -u llm_game.service -n 50 --no-pager

# Check if port 8080 is already in use
sudo ss -tlnp | grep 8080

# Verify file permissions
ls -la /opt/llm_game

# Check python path in service file
sudo systemctl cat llm_game.service
```

### Permission issues / Проблемы с правами доступа

```bash
# Fix ownership
sudo chown -R www-data:www-data /opt/llm_game

# Verify permissions
sudo -u www-data ls -la /opt/llm_game
```

### Port access issues / Проблемы с доступом к порту

```bash
# Check firewall status
sudo ufw status

# Allow port 8080
sudo ufw allow 8080/tcp

# Check if service is listening
sudo ss -tlnp | grep 8080
```

### High memory usage / Высокое использование памяти

```bash
# Check current memory usage
sudo systemctl status llm_game.service

# Adjust MemoryMax in service file
sudo nano /etc/systemd/system/llm_game.service

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart llm_game.service
```

### WebSocket connection issues / Проблемы с WebSocket соединением

```bash
# Check nginx logs if using reverse proxy
sudo tail -f /var/log/nginx/error.log

# Verify WebSocket upgrade headers in nginx config
sudo nginx -T | grep -A 5 "location /ws"

# Test direct connection without proxy
curl http://localhost:8080
```

## Security Recommendations / Рекомендации по безопасности

**English:**
1. Always use a reverse proxy (nginx/apache) in production
2. Enable HTTPS with SSL certificates (Let's Encrypt)
3. Configure firewall to allow only necessary ports
4. Keep system and dependencies up to date
5. Monitor logs regularly for suspicious activity
6. Consider using fail2ban for brute force protection
7. Limit MAX_SESSIONS in `server/game_server.py` based on server capacity
8. Set up automated backups
9. Use strong passwords for server access
10. Consider implementing rate limiting

**Русский:**
1. Всегда используйте reverse proxy (nginx/apache) в production
2. Включите HTTPS с SSL сертификатами (Let's Encrypt)
3. Настройте файрвол на разрешение только необходимых портов
4. Держите систему и зависимости актуальными
5. Регулярно мониторьте логи на подозрительную активность
6. Рассмотрите использование fail2ban для защиты от брутфорса
7. Ограничьте MAX_SESSIONS в `server/game_server.py` в зависимости от мощности сервера
8. Настройте автоматические бэкапы
9. Используйте надежные пароли для доступа к серверу
10. Рассмотрите внедрение rate limiting

## Performance Tuning / Настройка производительности

### Adjust Game Server Settings / Настройка параметров игрового сервера

Edit `/opt/llm_game/server/game_server.py`:

```python
MAX_SESSIONS = 50  # Adjust based on server capacity
```

### Adjust systemd Service Limits / Настройка лимитов systemd сервиса

Edit `/etc/systemd/system/llm_game.service`:

```ini
# Increase file descriptor limit for more connections
LimitNOFILE=65536

# Adjust memory limit (default: 1G)
MemoryMax=2G

# Adjust CPU quota (default: 200% = 2 cores)
CPUQuota=400%
```

After editing, reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart llm_game.service
```

## Monitoring / Мониторинг

### Check Service Status / Проверка статуса сервиса

```bash
# Service status
systemctl status llm_game.service

# Resource usage
systemctl show llm_game.service | grep -E "Memory|CPU"
```

### Monitor Logs / Мониторинг логов

```bash
# Real-time monitoring
sudo journalctl -u llm_game.service -f

# Filter by priority (errors only)
sudo journalctl -u llm_game.service -p err

# Export logs to file
sudo journalctl -u llm_game.service --since "1 hour ago" > /tmp/llm_game.log
```

### System Resource Monitoring / Мониторинг системных ресурсов

```bash
# CPU and memory usage
htop

# Network connections
sudo ss -tunap | grep 8080

# Disk usage
df -h
```

## Support / Поддержка

If you encounter issues not covered in this guide, please:
- Check the [GitHub Issues](https://github.com/andchir/llm_game/issues)
- Review application logs: `sudo journalctl -u llm_game.service -n 100`
- Open a new issue with detailed information about your problem

Если вы столкнулись с проблемами, не описанными в этом руководстве:
- Проверьте [GitHub Issues](https://github.com/andchir/llm_game/issues)
- Просмотрите логи приложения: `sudo journalctl -u llm_game.service -n 100`
- Откройте новый issue с подробной информацией о проблеме
