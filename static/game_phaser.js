/**
 * Phaser.js version of the multiplayer circle shooter game
 * This implementation uses Phaser 3 framework for rendering and game logic
 */

class PhaserGame {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.players = {};
        this.bullets = {};
        this.localPlayer = {
            x: 0,
            y: 0,
            angle: 0,
            size: 20,
            color: '#ffffff',
            name: 'player'
        };
        this.config = {
            canvas_width: 800,
            canvas_height: 600,
            player_speed: 5
        };
        this.lastShootTime = 0;
        this.shootCooldown = 250;
        this.lastAngleUpdateTime = 0;
        this.angleUpdateThrottle = 50;
        this.lastPositionUpdateTime = 0;
        this.positionUpdateThrottle = 50;

        // Click/tap to move state
        this.targetPosition = null;
        this.lastClickTime = 0;
        this.doubleClickThreshold = 300;

        // Interpolation state
        this.playerInterpolation = {};
        this.playerUpdateBuffer = {};
        this.interpolationDelay = 150;

        // Client-side prediction: threshold for server reconciliation
        // Only apply server correction if mismatch is larger than this
        this.serverReconciliationThreshold = 15; // pixels

        // Death flash effect state
        this.deathFlashActive = false;
        this.deathFlashStartTime = 0;
        this.deathFlashDuration = 1500; // milliseconds

        // Phaser game objects
        this.playerSprites = {};
        this.bulletSprites = {};
        this.phaserGame = null;
        this.gameScene = null;

        this.init();
    }

    init() {
        this.setupNameModal();
        this.setupPhaserGame();
        this.setupWebSocket();
    }

    setupNameModal() {
        const modal = document.getElementById('name-modal');
        const nameInput = document.getElementById('player-name-input');
        const submitBtn = document.getElementById('name-submit-btn');

        const submitName = () => {
            let name = nameInput.value.trim();
            if (!name) {
                name = this.localPlayer.name;
            }

            this.localPlayer.name = name;

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.sendNameChange(name);
            } else {
                this.pendingName = name;
            }

            modal.classList.add('hidden');
        };

        submitBtn.addEventListener('click', submitName);
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitName();
            }
        });

        nameInput.focus();
    }

    setupPhaserGame() {
        const self = this;

        // Main game scene
        class GameScene extends Phaser.Scene {
            constructor() {
                super({ key: 'GameScene' });
            }

            preload() {
                // No assets to preload - we'll draw everything with graphics
            }

            create() {
                self.gameScene = this;

                // Set up background
                this.cameras.main.setBackgroundColor('#0a0a0a');

                // Create grid graphics
                const graphics = this.add.graphics();
                graphics.lineStyle(1, 0x1a1a1a, 1);

                // Draw grid
                for (let x = 0; x < 800; x += 50) {
                    graphics.lineBetween(x, 0, x, 600);
                }
                for (let y = 0; y < 600; y += 50) {
                    graphics.lineBetween(0, y, 800, y);
                }

                // Create death flash overlay (initially invisible)
                this.deathFlashGraphics = this.add.graphics();
                this.deathFlashGraphics.setDepth(1000);

                // Create death message text (initially invisible)
                this.deathMessageText = this.add.text(400, 300, 'Вы убиты', {
                    fontSize: '48px',
                    fontFamily: 'Arial',
                    fontStyle: 'bold',
                    color: '#ffffff',
                    stroke: '#ff0000',
                    strokeThickness: 4
                });
                this.deathMessageText.setOrigin(0.5, 0.5);
                this.deathMessageText.setDepth(1001);
                this.deathMessageText.setVisible(false);

                // Enable input
                this.input.on('pointermove', (pointer) => {
                    self.handlePointerMove(pointer);
                });

                // Touch/click on mobile - update angle
                this.input.on('pointerdown', (pointer) => {
                    self.handlePointerDown(pointer);
                });

                // Keyboard controls
                this.cursors = this.input.keyboard.createCursorKeys();
                this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

                // Handle space key for shooting
                this.spaceKey.on('down', () => {
                    self.shoot();
                });
            }

            update() {
                self.updateGame();
                self.updateInterpolation();
                self.updateDeathFlash();
            }
        }

        // Phaser configuration
        const config = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            parent: 'phaser-game',
            backgroundColor: '#0a0a0a',
            scene: [GameScene],
            physics: {
                default: 'arcade',
                arcade: {
                    debug: false
                }
            }
        };

        this.phaserGame = new Phaser.Game(config);
    }

    setupWebSocket() {
        let wsUrl;
        if (window.GAME_CONFIG && window.GAME_CONFIG.wsUrl) {
            wsUrl = window.GAME_CONFIG.wsUrl;
        } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl = `${protocol}//${window.location.host}/ws`;
        }

        console.log('Connecting to WebSocket:', wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Connected to server');
            this.updateStatus('Connected', true);

            if (this.pendingName) {
                this.sendNameChange(this.pendingName);
                this.pendingName = null;
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateStatus('Connection Error', false);
            this.showError('Connection error occurred');
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.updateStatus('Disconnected', false);
            this.showError('Disconnected from server. Refresh to reconnect.');
        };
    }

    handleMessage(message) {
        switch (message.type) {
            case 'init':
                this.playerId = message.player_id;
                this.localPlayer = message.player;
                this.players[this.playerId] = this.localPlayer;
                this.config = message.config;
                console.log('Initialized as player:', this.playerId);

                const nameInput = document.getElementById('player-name-input');
                if (nameInput) {
                    nameInput.value = this.localPlayer.name;
                }
                break;

            case 'state':
                const currentTime = performance.now();
                this.bullets = message.data.bullets;

                for (const [id, newPlayerData] of Object.entries(message.data.players)) {
                    if (!this.players[id]) {
                        this.players[id] = { ...newPlayerData };
                    }

                    this.players[id].size = newPlayerData.size;
                    this.players[id].color = newPlayerData.color;
                    this.players[id].name = newPlayerData.name;

                    // For local player, use client-side prediction with server reconciliation
                    // The client is authoritative for its own position to ensure smooth movement
                    if (id === this.playerId) {
                        // Check if server position differs significantly from client prediction
                        const dx = newPlayerData.x - this.localPlayer.x;
                        const dy = newPlayerData.y - this.localPlayer.y;
                        const distanceSquared = dx * dx + dy * dy;
                        const threshold = this.serverReconciliationThreshold;

                        // Only apply server correction if mismatch exceeds threshold
                        // This prevents small network jitter from causing stuttering
                        if (distanceSquared > threshold * threshold) {
                            // Significant mismatch detected - apply gentle correction
                            // Use smooth interpolation instead of instant snap for better UX
                            const correctionFactor = 0.3; // 30% correction per frame
                            this.localPlayer.x += dx * correctionFactor;
                            this.localPlayer.y += dy * correctionFactor;
                        }

                        // Always update angle from server (less noticeable, prevents shooting misalignment)
                        this.localPlayer.angle = newPlayerData.angle;
                        this.players[id] = this.localPlayer;
                        continue; // Skip interpolation setup for local player
                    }

                    if (!this.playerUpdateBuffer[id]) {
                        this.playerUpdateBuffer[id] = [];
                    }

                    this.playerUpdateBuffer[id].push({
                        x: newPlayerData.x,
                        y: newPlayerData.y,
                        angle: newPlayerData.angle,
                        timestamp: currentTime
                    });

                    if (this.playerUpdateBuffer[id].length > 5) {
                        this.playerUpdateBuffer[id].shift();
                    }

                    if (!this.playerInterpolation[id]) {
                        this.playerInterpolation[id] = {
                            currentX: newPlayerData.x,
                            currentY: newPlayerData.y,
                            currentAngle: newPlayerData.angle
                        };
                        this.players[id].x = newPlayerData.x;
                        this.players[id].y = newPlayerData.y;
                        this.players[id].angle = newPlayerData.angle;
                    }
                }

                if (message.hits && message.hits.length > 0) {
                    message.hits.forEach(hit => {
                        if (hit.player_id === this.playerId) {
                            this.startDeathFlash();
                        }
                    });
                }

                this.renderPlayers();
                this.renderBullets();
                break;

            case 'player_joined':
                this.players[message.player_id] = message.player;
                console.log('Player joined:', message.player_id);
                break;

            case 'player_left':
                delete this.players[message.player_id];
                delete this.playerInterpolation[message.player_id];
                delete this.playerUpdateBuffer[message.player_id];
                if (this.playerSprites[message.player_id]) {
                    this.playerSprites[message.player_id].circle.destroy();
                    this.playerSprites[message.player_id].gun.destroy();
                    this.playerSprites[message.player_id].gunTip.destroy();
                    if (this.playerSprites[message.player_id].nameText) {
                        this.playerSprites[message.player_id].nameText.destroy();
                    }
                    delete this.playerSprites[message.player_id];
                }
                console.log('Player left:', message.player_id);
                break;

            case 'bullet_created':
                this.bullets[message.bullet.id] = message.bullet;
                break;

            case 'player_name_changed':
                if (this.players[message.player_id]) {
                    this.players[message.player_id].name = message.name;
                    console.log(`Player ${message.player_id} changed name to: ${message.name}`);
                }
                break;

            case 'player_hit':
                // Direct hit notification to ensure death screen always appears
                if (message.hit && message.hit.player_id === this.playerId) {
                    this.startDeathFlash();
                }
                break;

            case 'error':
                this.showError(message.message);
                break;

            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    handlePointerMove(pointer) {
        if (!this.playerId || !this.gameScene) return;

        const mouseX = pointer.x;
        const mouseY = pointer.y;

        const dx = mouseX - this.localPlayer.x;
        const dy = mouseY - this.localPlayer.y;
        const newAngle = Math.atan2(dy, dx);

        if (this.localPlayer.angle !== newAngle) {
            this.localPlayer.angle = newAngle;

            const now = Date.now();
            if (now - this.lastAngleUpdateTime >= this.angleUpdateThrottle) {
                this.lastAngleUpdateTime = now;
                this.sendAngleUpdate();
            }
        }
    }

    handlePointerDown(pointer) {
        // Update cannon angle towards tap/click position and shoot
        if (!this.playerId) return;

        const mouseX = pointer.x;
        const mouseY = pointer.y;

        const dx = mouseX - this.localPlayer.x;
        const dy = mouseY - this.localPlayer.y;
        const newAngle = Math.atan2(dy, dx);

        if (this.localPlayer.angle !== newAngle) {
            this.localPlayer.angle = newAngle;

            const now = Date.now();
            if (now - this.lastAngleUpdateTime >= this.angleUpdateThrottle) {
                this.lastAngleUpdateTime = now;
                this.sendAngleUpdate();
            }
        }

        // Shoot in the cannon direction
        this.shoot();
    }

    updateGame() {
        if (!this.playerId || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.gameScene) {
            return;
        }

        let moved = false;
        const speed = this.config.player_speed;

        // Keyboard movement
        let keyboardMovement = false;
        const cursors = this.gameScene.cursors;

        if (cursors.up.isDown) {
            this.localPlayer.y -= speed;
            moved = true;
            keyboardMovement = true;
        }
        if (cursors.down.isDown) {
            this.localPlayer.y += speed;
            moved = true;
            keyboardMovement = true;
        }
        if (cursors.left.isDown) {
            this.localPlayer.x -= speed;
            moved = true;
            keyboardMovement = true;
        }
        if (cursors.right.isDown) {
            this.localPlayer.x += speed;
            moved = true;
            keyboardMovement = true;
        }

        if (keyboardMovement) {
            this.targetPosition = null;
        }

        // Click/tap to move
        if (this.targetPosition && !keyboardMovement) {
            const dx = this.targetPosition.x - this.localPlayer.x;
            const dy = this.targetPosition.y - this.localPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < speed) {
                this.localPlayer.x = this.targetPosition.x;
                this.localPlayer.y = this.targetPosition.y;
                this.targetPosition = null;
                moved = true;
            } else {
                const angle = Math.atan2(dy, dx);
                this.localPlayer.x += Math.cos(angle) * speed;
                this.localPlayer.y += Math.sin(angle) * speed;
                moved = true;
            }
        }

        // Clamp position, considering player size (radius) to prevent going beyond boundaries
        this.localPlayer.x = Math.max(this.localPlayer.size, Math.min(this.config.canvas_width - this.localPlayer.size, this.localPlayer.x));
        this.localPlayer.y = Math.max(this.localPlayer.size, Math.min(this.config.canvas_height - this.localPlayer.size, this.localPlayer.y));

        if (moved) {
            const now = Date.now();
            if (now - this.lastPositionUpdateTime >= this.positionUpdateThrottle) {
                this.lastPositionUpdateTime = now;
                this.sendUpdate();
            }
        }
    }

    updateInterpolation() {
        const currentTime = performance.now();
        const renderTime = currentTime - this.interpolationDelay;

        for (const [id, buffer] of Object.entries(this.playerUpdateBuffer)) {
            if (!this.players[id] || buffer.length === 0) {
                continue;
            }

            if (id === this.playerId) {
                continue;
            }

            const interp = this.playerInterpolation[id];
            if (!interp) {
                continue;
            }

            let update1 = null;
            let update2 = null;

            for (let i = 0; i < buffer.length - 1; i++) {
                if (buffer[i].timestamp <= renderTime && buffer[i + 1].timestamp >= renderTime) {
                    update1 = buffer[i];
                    update2 = buffer[i + 1];
                    break;
                }
            }

            if (update1 && update2) {
                const totalTime = update2.timestamp - update1.timestamp;
                const elapsed = renderTime - update1.timestamp;
                const t = totalTime > 0 ? Math.min(1, elapsed / totalTime) : 1;

                const smoothT = this.easeOutCubic(t);

                interp.currentX = update1.x + (update2.x - update1.x) * smoothT;
                interp.currentY = update1.y + (update2.y - update1.y) * smoothT;

                let angleDiff = update2.angle - update1.angle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                interp.currentAngle = update1.angle + angleDiff * smoothT;

                this.players[id].x = interp.currentX;
                this.players[id].y = interp.currentY;
                this.players[id].angle = interp.currentAngle;

            } else if (buffer.length > 0) {
                const oldestUpdate = buffer[0];

                if (renderTime < oldestUpdate.timestamp) {
                    const speed = 0.15;
                    interp.currentX += (oldestUpdate.x - interp.currentX) * speed;
                    interp.currentY += (oldestUpdate.y - interp.currentY) * speed;

                    let angleDiff = oldestUpdate.angle - interp.currentAngle;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    interp.currentAngle += angleDiff * speed;

                    this.players[id].x = interp.currentX;
                    this.players[id].y = interp.currentY;
                    this.players[id].angle = interp.currentAngle;
                }
            }

            while (buffer.length > 2 && buffer[0].timestamp < renderTime - 200) {
                buffer.shift();
            }
        }
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    renderPlayers() {
        if (!this.gameScene) return;

        // Update existing players and create new ones
        for (const [id, player] of Object.entries(this.players)) {
            const isLocal = id === this.playerId;

            if (!this.playerSprites[id]) {
                // Create new player sprite
                const graphics = this.gameScene.add.graphics();
                const gun = this.gameScene.add.graphics();
                const gunTip = this.gameScene.add.graphics();
                const nameText = this.gameScene.add.text(player.x, player.y - player.size - 15, player.name, {
                    fontSize: '12px',
                    color: '#ffffff',
                    backgroundColor: '#000000',
                    padding: { x: 5, y: 2 }
                });
                nameText.setOrigin(0.5, 0.5);

                this.playerSprites[id] = {
                    circle: graphics,
                    gun: gun,
                    gunTip: gunTip,
                    nameText: nameText
                };
            }

            const sprite = this.playerSprites[id];

            // Clear and redraw player circle
            sprite.circle.clear();
            const color = parseInt(player.color.replace('#', '0x'));
            sprite.circle.fillStyle(color, 1);
            sprite.circle.fillCircle(player.x, player.y, player.size);

            if (isLocal) {
                sprite.circle.lineStyle(3, 0xffffff, 1);
                sprite.circle.strokeCircle(player.x, player.y, player.size);
            }

            // Draw gun
            sprite.gun.clear();
            sprite.gun.lineStyle(3, 0xffffff, 1);
            const gunLength = player.size;
            const gunEndX = player.x + Math.cos(player.angle) * gunLength;
            const gunEndY = player.y + Math.sin(player.angle) * gunLength;
            sprite.gun.lineBetween(player.x, player.y, gunEndX, gunEndY);

            // Draw gun tip
            sprite.gunTip.clear();
            sprite.gunTip.fillStyle(0xffffff, 1);
            sprite.gunTip.fillCircle(gunEndX, gunEndY, 3);

            // Update name text
            sprite.nameText.setText(player.name);
            sprite.nameText.setPosition(player.x, player.y - player.size - 15);
        }

        // Remove sprites for players that left
        for (const id of Object.keys(this.playerSprites)) {
            if (!this.players[id]) {
                this.playerSprites[id].circle.destroy();
                this.playerSprites[id].gun.destroy();
                this.playerSprites[id].gunTip.destroy();
                this.playerSprites[id].nameText.destroy();
                delete this.playerSprites[id];
            }
        }

        this.updateUI();
    }

    renderBullets() {
        if (!this.gameScene) return;

        // Remove old bullet sprites
        for (const id of Object.keys(this.bulletSprites)) {
            if (!this.bullets[id]) {
                this.bulletSprites[id].destroy();
                delete this.bulletSprites[id];
            }
        }

        // Create or update bullet sprites
        for (const [id, bullet] of Object.entries(this.bullets)) {
            if (!this.bulletSprites[id]) {
                const graphics = this.gameScene.add.graphics();
                this.bulletSprites[id] = graphics;
            }

            const sprite = this.bulletSprites[id];
            sprite.clear();

            // Draw bullet
            sprite.fillStyle(0xff0000, 1);
            sprite.fillCircle(bullet.x, bullet.y, 5);

            // Glow effect
            sprite.lineStyle(2, 0xff6666, 1);
            sprite.strokeCircle(bullet.x, bullet.y, 5);
        }
    }

    sendUpdate() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        this.ws.send(JSON.stringify({
            type: 'update',
            data: {
                x: this.localPlayer.x,
                y: this.localPlayer.y,
                angle: this.localPlayer.angle
            }
        }));
    }

    sendAngleUpdate() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        this.ws.send(JSON.stringify({
            type: 'update',
            data: {
                angle: this.localPlayer.angle
            }
        }));
    }

    sendNameChange(name) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        this.ws.send(JSON.stringify({
            type: 'change_name',
            name: name
        }));
    }

    shoot() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.playerId) {
            return;
        }

        const now = Date.now();
        if (now - this.lastShootTime < this.shootCooldown) {
            return;
        }
        this.lastShootTime = now;

        this.sendAngleUpdate();

        this.ws.send(JSON.stringify({
            type: 'shoot'
        }));
    }

    updateUI() {
        const playerCount = Object.keys(this.players).length;
        document.getElementById('player-count').textContent = playerCount;

        if (this.localPlayer) {
            const size = Math.round(this.localPlayer.size);
            document.getElementById('player-size').textContent = size;
        }
    }

    updateStatus(text, connected) {
        const statusText = document.getElementById('status-text');
        const statusIndicator = document.querySelector('.connection-status');

        statusText.textContent = text;

        if (connected) {
            statusIndicator.classList.add('connected');
        } else {
            statusIndicator.classList.remove('connected');
        }
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.classList.add('show');

        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    }

    updateDeathFlash() {
        if (!this.gameScene || !this.gameScene.deathFlashGraphics) return;

        if (this.deathFlashActive) {
            const elapsed = performance.now() - this.deathFlashStartTime;

            if (elapsed < this.deathFlashDuration) {
                // Calculate flash intensity (fades out over time)
                const progress = elapsed / this.deathFlashDuration;
                // Create pulsing effect with sine wave
                const pulseFrequency = 8; // Number of flashes
                const pulse = Math.sin(progress * Math.PI * pulseFrequency);
                const alpha = (1 - progress) * 0.5 * (pulse * 0.5 + 0.5);

                // Draw red flash overlay
                this.gameScene.deathFlashGraphics.clear();
                this.gameScene.deathFlashGraphics.fillStyle(0xff0000, alpha);
                this.gameScene.deathFlashGraphics.fillRect(0, 0, 800, 600);

                // Show and update death message text with fading alpha
                const messageAlpha = (1 - progress) * 0.9;
                this.gameScene.deathMessageText.setAlpha(messageAlpha);
                this.gameScene.deathMessageText.setVisible(true);
            } else {
                // Flash effect finished
                this.deathFlashActive = false;
                this.gameScene.deathFlashGraphics.clear();
                this.gameScene.deathMessageText.setVisible(false);
            }
        } else {
            // Make sure graphics are cleared when not active
            this.gameScene.deathFlashGraphics.clear();
            this.gameScene.deathMessageText.setVisible(false);
        }
    }

    startDeathFlash() {
        this.deathFlashActive = true;
        this.deathFlashStartTime = performance.now();
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.phaserGame = new PhaserGame();
    // Expose properties for testing
    Object.defineProperty(window, 'ws', {
        get() { return window.phaserGame ? window.phaserGame.ws : null; }
    });
    Object.defineProperty(window, 'playerId', {
        get() { return window.phaserGame ? window.phaserGame.playerId : null; }
    });
    Object.defineProperty(window, 'players', {
        get() { return window.phaserGame ? window.phaserGame.players : {}; }
    });
    Object.defineProperty(window, 'bullets', {
        get() { return window.phaserGame ? window.phaserGame.bullets : {}; }
    });
});
