# LLM Game - Multiplayer Circle Shooter

Браузерная онлайн игра с использованием Python и JavaScript. Игроки отображаются в виде цветных кружков, которые могут двигаться и стрелять друг в друга в режиме реального времени.

Browser-based online multiplayer game using Python and JavaScript. Players are displayed as colored circles that can move and shoot at each other in real-time.

## Features / Особенности

- **Real-time multiplayer** / Многопользовательская игра в реальном времени
- **WebSocket communication** / WebSocket соединение для синхронизации
- **Multiple versions** / Несколько версий:
  - **Canvas version** - Vanilla JS with HTML5 Canvas / Чистый JS с Canvas
  - **Phaser.js version** - Popular game framework / Популярный игровой фреймворк
  - **3D version** - Three.js 3D rendering / 3D рендеринг с Three.js
- **Player growth mechanics** / Механика роста персонажа
- **Shooting and collision detection** / Стрельба и определение столкновений
- **Session limit** / Ограничение количества сессий (до 50 игроков)
- **Respawn system** / Система возрождения при попадании

## Game Mechanics / Игровая механика

- Players are represented as colored circles with a gun indicator / Игроки - цветные кружки с индикатором оружия
- Move using arrow keys / Управление стрелками клавиатуры
- Shoot with space bar or mouse click / Стрельба клавишей пробел или кликом мыши
- Aim with mouse / Прицеливание мышью
- Player size gradually increases over time / Размер игрока постепенно увеличивается
- Getting hit reduces size and respawns player in upper-right corner / Попадание уменьшает размер и переносит в правый верхний угол
- Bullets are small red circles / Пули - маленькие красные кружки

## Requirements / Требования

- Python 3.7+
- aiohttp

## Installation / Установка

1. Clone the repository / Клонировать репозиторий:
```bash
git clone https://github.com/andchir/llm_game.git
cd llm_game
```

2. Install dependencies / Установить зависимости:
```bash
pip install -r requirements.txt
```

## Running the Game / Запуск игры

1. Start the server / Запустить сервер:
```bash
python server/game_server.py
```

2. Open your browser and navigate to / Откройте браузер и перейдите по адресу:

**Canvas version (default):**
```
http://localhost:8080
```

**Phaser.js version:**
```
http://localhost:8080/static/index_phaser.html
```

**3D version:**
```
http://localhost:8080/static/index3d.html
```

3. Open multiple browser windows/tabs to test multiplayer / Откройте несколько окон/вкладок браузера для тестирования многопользовательского режима

## Controls / Управление

- **Arrow Keys** / **Стрелки**: Move your circle / Движение кружка
- **Space Bar** or **Mouse Click** / **Пробел** или **Клик мыши**: Shoot / Выстрел
- **Mouse Movement** / **Движение мыши**: Aim / Прицеливание

## Configuration / Конфигурация

Game parameters can be adjusted in `server/game_server.py`:

Параметры игры можно настроить в `server/game_server.py`:

- `MAX_SESSIONS`: Maximum number of concurrent players (default: 50) / Максимальное количество игроков
- `CANVAS_WIDTH`, `CANVAS_HEIGHT`: Game area size / Размер игровой области
- `PLAYER_INITIAL_SIZE`: Starting player size / Начальный размер игрока
- `PLAYER_MAX_SIZE`: Maximum player size / Максимальный размер игрока
- `PLAYER_GROWTH_RATE`: How fast players grow / Скорость роста игрока
- `PLAYER_SPEED`: Movement speed / Скорость движения
- `BULLET_SPEED`: Bullet velocity / Скорость пуль
- `HIT_SIZE_REDUCTION`: Size reduction on hit / Уменьшение размера при попадании

## Project Structure / Структура проекта

```
llm_game/
├── server/
│   └── game_server.py      # Python WebSocket server / Сервер на Python
├── static/
│   ├── index.html          # Canvas version HTML / HTML Canvas версии
│   ├── game.js             # Canvas version JS / JS Canvas версии
│   ├── index_phaser.html   # Phaser.js version HTML / HTML Phaser.js версии
│   ├── game_phaser.js      # Phaser.js version JS / JS Phaser.js версии
│   ├── index3d.html        # 3D version HTML / HTML 3D версии
│   └── game3d.js           # 3D version JS / JS 3D версии
├── examples/               # Example and test scripts / Примеры и тесты
├── experiments/            # Experimental code / Экспериментальный код
├── requirements.txt        # Python dependencies / Зависимости Python
└── README.md              # This file / Этот файл
```

## Architecture / Архитектура

### Server Side / Серверная часть

- **Python aiohttp server** with WebSocket support / Сервер на Python с поддержкой WebSocket
- **GameState class**: Manages players, bullets, and game logic / Управляет игроками, пулями и игровой логикой
- **Game loop**: Runs at 30 FPS, updates positions, checks collisions / Цикл игры на 30 FPS
- **Session management**: In-memory storage with configurable limit / Управление сессиями в памяти

### Client Side / Клиентская часть

The game has three client versions, all using the same server:

**Canvas Version (Vanilla JS):**
- **Canvas rendering**: All game objects drawn on HTML5 Canvas / Рендеринг через Canvas
- **WebSocket client**: Real-time communication with server / WebSocket для связи с сервером
- **Input handling**: Keyboard and mouse controls / Обработка клавиатуры и мыши
- **Smooth rendering**: RequestAnimationFrame for fluid animation / Плавная анимация

**Phaser.js Version:**
- **Phaser 3 framework**: Industry-standard game framework / Индустриальный стандарт игрового фреймворка
- **Hardware-accelerated rendering**: WebGL and Canvas support / Аппаратное ускорение через WebGL
- **Built-in physics**: Arcade physics system / Встроенная физическая система
- **Same networking**: Uses the same WebSocket server / Использует тот же WebSocket сервер
- **CDN delivery**: Phaser loaded from CDN for fast access / Phaser загружается из CDN

**3D Version (Three.js):**
- **3D rendering**: Full 3D graphics with Three.js / Полный 3D рендеринг с Three.js
- **Same gameplay**: Identical mechanics in 3D space / Та же механика в 3D пространстве

## Production Deployment / Развертывание в production

### Option 1: GitHub Actions + Pages (Recommended for Demo)

For automated deployment using GitHub Actions and GitHub Pages, see [GITHUB_ACTIONS_DEPLOYMENT.md](GITHUB_ACTIONS_DEPLOYMENT.md).

Для автоматического развертывания с GitHub Actions и GitHub Pages, см. [GITHUB_ACTIONS_DEPLOYMENT.md](GITHUB_ACTIONS_DEPLOYMENT.md).

**Quick overview / Краткий обзор:**
- GitHub Actions workflow included / Включен GitHub Actions workflow
- Frontend deployment to GitHub Pages / Развертывание frontend на GitHub Pages
- Backend deployment to free services (Render, Railway, Fly.io) / Развертывание backend на бесплатные сервисы
- Configurable WebSocket URL / Настраиваемый WebSocket URL
- Step-by-step deployment guide / Пошаговое руководство по развертыванию

### Option 2: Ubuntu Server with systemd (For Production)

For detailed instructions on deploying to a production Ubuntu server with systemd, see [DEPLOYMENT.md](DEPLOYMENT.md).

Для подробных инструкций по развертыванию на production Ubuntu сервере с systemd, см. [DEPLOYMENT.md](DEPLOYMENT.md).

**Quick overview / Краткий обзор:**
- systemd service configuration included / Включена конфигурация systemd сервиса
- Nginx reverse proxy setup / Настройка Nginx reverse proxy
- SSL/HTTPS with Let's Encrypt / SSL/HTTPS с Let's Encrypt
- Security hardening / Усиление безопасности
- Monitoring and troubleshooting / Мониторинг и устранение неполадок

## Development / Разработка

### Running Tests / Запуск тестов

#### Automated E2E Tests / Автоматизированные E2E тесты

This project includes Playwright tests for automated end-to-end testing / Проект включает Playwright тесты для автоматизированного тестирования:

**Install test dependencies / Установить зависимости для тестов:**
```bash
npm install
npx playwright install --with-deps chromium
```

**Run all tests / Запустить все тесты:**
```bash
npm test
```

**Run network throttling tests / Запустить тесты с ограничением сети:**
```bash
npm run test:network
```

**Run with UI / Запустить с интерфейсом:**
```bash
npm run test:ui
```

See `tests/README.md` for detailed testing documentation / См. `tests/README.md` для подробной документации по тестам.

#### Manual Testing / Ручное тестирование

Test scripts are available in the `examples/` directory / Тестовые скрипты в папке `examples/`

### Adding Features / Добавление функций

1. Server logic: Modify `server/game_server.py` / Логика сервера
2. Client rendering: Modify `static/game.js` / Рендеринг клиента
3. UI changes: Modify `static/index.html` / Изменения UI

## Troubleshooting / Устранение неполадок

### Server won't start / Сервер не запускается
- Check if port 8080 is available / Проверьте, свободен ли порт 8080
- Ensure Python 3.7+ is installed / Убедитесь, что установлен Python 3.7+
- Verify all dependencies are installed / Проверьте установку зависимостей

### Can't connect to game / Не удается подключиться
- Check browser console for errors / Проверьте консоль браузера
- Verify server is running / Убедитесь, что сервер запущен
- Try accessing `http://localhost:8080` / Попробуйте открыть `http://localhost:8080`

### Lag or stuttering / Задержки или подтормаживания
- Reduce number of connected players / Уменьшите количество игроков
- Check network connection / Проверьте сетевое соединение
- Lower game loop FPS in `game_server.py` / Понизьте FPS в `game_server.py`

## License / Лицензия

This project is open source and available under the MIT License.

Этот проект имеет открытый исходный код и доступен по лицензии MIT.
