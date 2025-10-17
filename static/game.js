/**
 * Client-side game logic for multiplayer circle shooter
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
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
        this.hoveredPlayer = null;
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            Space: false
        };
        this.config = {
            canvas_width: 800,
            canvas_height: 600,
            player_speed: 5
        };
        this.lastShootTime = 0;
        this.shootCooldown = 250; // milliseconds
        this.lastAngleUpdateTime = 0;
        this.angleUpdateThrottle = 50; // milliseconds - send angle updates max 20 times per second
        this.lastPositionUpdateTime = 0;
        this.positionUpdateThrottle = 50; // milliseconds - send position updates max 20 times per second

        // Click/tap to move state
        this.targetPosition = null;
        this.lastClickTime = 0;
        this.doubleClickThreshold = 300; // milliseconds for double click/tap detection

        // Advanced interpolation state for smooth movement with buffering
        this.playerInterpolation = {}; // Stores interpolation data for each remote player
        this.playerUpdateBuffer = {}; // Buffer to store incoming position updates
        this.lastFrameTime = performance.now();
        // Increased interpolation delay to handle network jitter better
        // With server broadcasting at 20 FPS (every 50ms), we need enough buffer
        // to smooth out network latency variations
        this.interpolationDelay = 150; // ms - intentional delay for smooth interpolation

        this.init();
    }

    init() {
        this.setupNameModal();
        this.setupWebSocket();
        this.setupControls();
        this.startGameLoop();
    }

    setupNameModal() {
        const modal = document.getElementById('name-modal');
        const nameInput = document.getElementById('player-name-input');
        const submitBtn = document.getElementById('name-submit-btn');

        const submitName = () => {
            let name = nameInput.value.trim();
            if (!name) {
                name = this.localPlayer.name; // Use default name if empty
            }

            // Update local player name
            this.localPlayer.name = name;

            // Send name to server when connected
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.sendNameChange(name);
            } else {
                // Store name to send after connection
                this.pendingName = name;
            }

            // Hide modal
            modal.classList.add('hidden');
        };

        submitBtn.addEventListener('click', submitName);
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitName();
            }
        });

        // Focus input when modal is shown
        nameInput.focus();
    }

    setupWebSocket() {
        // Use configured WebSocket URL if available, otherwise use default
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

            // Send pending name if available
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

                // Set default name in the input field
                const nameInput = document.getElementById('player-name-input');
                if (nameInput) {
                    nameInput.value = this.localPlayer.name;
                }
                break;

            case 'state':
                // Use buffered interpolation for smooth movement
                const currentTime = performance.now();

                // Update bullets directly (no interpolation needed)
                this.bullets = message.data.bullets;

                // Process each player in the server update
                for (const [id, newPlayerData] of Object.entries(message.data.players)) {
                    // Add or update player in our local state
                    if (!this.players[id]) {
                        this.players[id] = { ...newPlayerData };
                    }

                    // Update non-positional properties for all players
                    this.players[id].size = newPlayerData.size;
                    this.players[id].color = newPlayerData.color;
                    this.players[id].name = newPlayerData.name;

                    // For local player, update position directly from server (authoritative)
                    if (id === this.playerId) {
                        this.players[id].x = newPlayerData.x;
                        this.players[id].y = newPlayerData.y;
                        this.players[id].angle = newPlayerData.angle;
                        this.localPlayer = this.players[id];
                        continue; // Skip interpolation setup for local player
                    }

                    // For remote players, add to interpolation buffer
                    // Initialize buffer for new players
                    if (!this.playerUpdateBuffer[id]) {
                        this.playerUpdateBuffer[id] = [];
                    }

                    // Add update to buffer with timestamp
                    this.playerUpdateBuffer[id].push({
                        x: newPlayerData.x,
                        y: newPlayerData.y,
                        angle: newPlayerData.angle,
                        timestamp: currentTime
                    });

                    // Keep only last 5 updates (prevents buffer from growing unbounded)
                    if (this.playerUpdateBuffer[id].length > 5) {
                        this.playerUpdateBuffer[id].shift();
                    }

                    // Initialize interpolation state for new players
                    if (!this.playerInterpolation[id]) {
                        this.playerInterpolation[id] = {
                            currentX: newPlayerData.x,
                            currentY: newPlayerData.y,
                            currentAngle: newPlayerData.angle
                        };
                        // Set initial position immediately for new players
                        this.players[id].x = newPlayerData.x;
                        this.players[id].y = newPlayerData.y;
                        this.players[id].angle = newPlayerData.angle;
                    }
                }

                // Handle hits
                if (message.hits && message.hits.length > 0) {
                    message.hits.forEach(hit => {
                        if (hit.player_id === this.playerId) {
                            this.flashScreen('#ff0000');
                        }
                    });
                }
                break;

            case 'player_joined':
                this.players[message.player_id] = message.player;
                console.log('Player joined:', message.player_id);
                break;

            case 'player_left':
                delete this.players[message.player_id];
                delete this.playerInterpolation[message.player_id];
                delete this.playerUpdateBuffer[message.player_id];
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

            case 'error':
                this.showError(message.message);
                break;

            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    setupControls() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (e.code in this.keys) {
                e.preventDefault();
                this.keys[e.code] = true;

                // Handle shooting
                if (e.code === 'Space') {
                    this.shoot();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code in this.keys) {
                e.preventDefault();
                this.keys[e.code] = false;
            }
        });

        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse control for rotation
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.playerId) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate angle from player to mouse
            const dx = mouseX - this.localPlayer.x;
            const dy = mouseY - this.localPlayer.y;
            const newAngle = Math.atan2(dy, dx);

            // Only update if angle actually changed
            if (this.localPlayer.angle !== newAngle) {
                this.localPlayer.angle = newAngle;

                // Throttle angle updates to server to avoid overwhelming it
                const now = Date.now();
                if (now - this.lastAngleUpdateTime >= this.angleUpdateThrottle) {
                    this.lastAngleUpdateTime = now;
                    this.sendAngleUpdate();
                }
            }

            // Check if mouse is over any player to show tooltip
            this.checkPlayerHover(mouseX, mouseY, e.clientX, e.clientY);
        });

        // Click/tap to move, double-click/tap to shoot
        this.canvas.addEventListener('click', (e) => {
            const now = Date.now();
            const timeSinceLastClick = now - this.lastClickTime;

            if (timeSinceLastClick < this.doubleClickThreshold) {
                // Double click - shoot
                this.shoot();
                this.lastClickTime = 0; // Reset to prevent triple-click issues
                this.targetPosition = null; // Cancel movement on shoot
            } else {
                // Single click - set target position to move towards
                const rect = this.canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;

                this.targetPosition = { x: clickX, y: clickY };
                this.lastClickTime = now;
            }
        });

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const now = Date.now();
            const timeSinceLastClick = now - this.lastClickTime;

            if (timeSinceLastClick < this.doubleClickThreshold) {
                // Double tap - shoot
                this.shoot();
                this.lastClickTime = 0;
                this.targetPosition = null;
            } else {
                // Single tap - set target position
                const rect = this.canvas.getBoundingClientRect();
                const touch = e.touches[0];
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;

                this.targetPosition = { x: touchX, y: touchY };
                this.lastClickTime = now;
            }
        });
    }

    startGameLoop() {
        const loop = (currentTime) => {
            const deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;

            this.update();
            this.updateInterpolation(deltaTime);
            this.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    updateInterpolation(deltaTime) {
        const currentTime = performance.now();
        const renderTime = currentTime - this.interpolationDelay;

        // Update interpolation for all remote players using buffered updates
        for (const [id, buffer] of Object.entries(this.playerUpdateBuffer)) {
            // Skip if no player data or buffer is empty
            if (!this.players[id] || buffer.length === 0) {
                continue;
            }

            // Skip local player
            if (id === this.playerId) {
                continue;
            }

            const interp = this.playerInterpolation[id];
            if (!interp) {
                continue;
            }

            // Find the two updates to interpolate between
            // We want to find updates where: update1.timestamp <= renderTime <= update2.timestamp
            let update1 = null;
            let update2 = null;

            for (let i = 0; i < buffer.length - 1; i++) {
                if (buffer[i].timestamp <= renderTime && buffer[i + 1].timestamp >= renderTime) {
                    update1 = buffer[i];
                    update2 = buffer[i + 1];
                    break;
                }
            }

            // If we found two updates to interpolate between
            if (update1 && update2) {
                // Calculate interpolation factor based on time
                const totalTime = update2.timestamp - update1.timestamp;
                const elapsed = renderTime - update1.timestamp;
                const t = totalTime > 0 ? Math.min(1, elapsed / totalTime) : 1;

                // Apply smooth easing
                const smoothT = this.easeOutCubic(t);

                // Interpolate position
                interp.currentX = update1.x + (update2.x - update1.x) * smoothT;
                interp.currentY = update1.y + (update2.y - update1.y) * smoothT;

                // Interpolate angle (handle wrap-around)
                let angleDiff = update2.angle - update1.angle;
                // Normalize angle difference to [-PI, PI]
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                interp.currentAngle = update1.angle + angleDiff * smoothT;

                // Update player position with interpolated values
                this.players[id].x = interp.currentX;
                this.players[id].y = interp.currentY;
                this.players[id].angle = interp.currentAngle;

            } else if (buffer.length > 0) {
                // If we can't find two updates to interpolate, use the most recent one
                // This handles cases where we're ahead of or behind the buffer
                const latestUpdate = buffer[buffer.length - 1];

                // Smoothly move towards the latest position
                const speed = 0.3; // Smoothing factor
                interp.currentX += (latestUpdate.x - interp.currentX) * speed;
                interp.currentY += (latestUpdate.y - interp.currentY) * speed;

                // Handle angle smoothing
                let angleDiff = latestUpdate.angle - interp.currentAngle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                interp.currentAngle += angleDiff * speed;

                // Update player position
                this.players[id].x = interp.currentX;
                this.players[id].y = interp.currentY;
                this.players[id].angle = interp.currentAngle;
            }

            // Clean up old updates that are no longer needed
            while (buffer.length > 2 && buffer[0].timestamp < renderTime - 200) {
                buffer.shift();
            }
        }
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    update() {
        if (!this.playerId || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        // Handle movement
        let moved = false;
        const speed = this.config.player_speed;

        // Keyboard movement (takes priority)
        let keyboardMovement = false;
        if (this.keys.ArrowUp) {
            this.localPlayer.y -= speed;
            moved = true;
            keyboardMovement = true;
        }
        if (this.keys.ArrowDown) {
            this.localPlayer.y += speed;
            moved = true;
            keyboardMovement = true;
        }
        if (this.keys.ArrowLeft) {
            this.localPlayer.x -= speed;
            moved = true;
            keyboardMovement = true;
        }
        if (this.keys.ArrowRight) {
            this.localPlayer.x += speed;
            moved = true;
            keyboardMovement = true;
        }

        // If keyboard is used, cancel target position
        if (keyboardMovement) {
            this.targetPosition = null;
        }

        // Handle click/tap to move
        if (this.targetPosition && !keyboardMovement) {
            const dx = this.targetPosition.x - this.localPlayer.x;
            const dy = this.targetPosition.y - this.localPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If we're close enough to target, stop moving
            if (distance < speed) {
                this.localPlayer.x = this.targetPosition.x;
                this.localPlayer.y = this.targetPosition.y;
                this.targetPosition = null;
                moved = true;
            } else {
                // Move towards target
                const angle = Math.atan2(dy, dx);
                this.localPlayer.x += Math.cos(angle) * speed;
                this.localPlayer.y += Math.sin(angle) * speed;
                moved = true;
            }
        }

        // Clamp position to canvas bounds
        this.localPlayer.x = Math.max(0, Math.min(this.config.canvas_width, this.localPlayer.x));
        this.localPlayer.y = Math.max(0, Math.min(this.config.canvas_height, this.localPlayer.y));

        // Send update to server if moved, but throttle to avoid overwhelming the network
        if (moved) {
            const now = Date.now();
            if (now - this.lastPositionUpdateTime >= this.positionUpdateThrottle) {
                this.lastPositionUpdateTime = now;
                this.sendUpdate();
            }
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

        // Check cooldown
        const now = Date.now();
        if (now - this.lastShootTime < this.shootCooldown) {
            return;
        }
        this.lastShootTime = now;

        // Send current angle to server immediately before shooting to ensure accuracy
        this.sendAngleUpdate();

        // Send shoot command to server
        this.ws.send(JSON.stringify({
            type: 'shoot'
        }));
    }

    checkPlayerHover(canvasX, canvasY, screenX, screenY) {
        const tooltip = document.getElementById('player-tooltip');
        let hoveredPlayerId = null;

        // Check if mouse is over any player
        for (const [id, player] of Object.entries(this.players)) {
            const dx = canvasX - player.x;
            const dy = canvasY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= player.size) {
                hoveredPlayerId = id;
                // Show tooltip with player name
                tooltip.textContent = player.name || id;
                tooltip.style.display = 'block';
                tooltip.style.left = `${screenX + 10}px`;
                tooltip.style.top = `${screenY + 10}px`;
                break;
            }
        }

        // Hide tooltip if not hovering over any player
        if (!hoveredPlayerId) {
            tooltip.style.display = 'none';
        }

        this.hoveredPlayer = hoveredPlayerId;
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid for reference
        this.drawGrid();

        // Draw all players
        for (const [id, player] of Object.entries(this.players)) {
            const isLocalPlayer = id === this.playerId;
            this.drawPlayer(player, isLocalPlayer);
        }

        // Draw all bullets
        for (const bullet of Object.values(this.bullets)) {
            this.drawBullet(bullet);
        }

        // Update UI
        this.updateUI();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#1a1a1a';
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawPlayer(player, isLocal) {
        const { x, y, angle, size, color } = player;

        // Draw player circle
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw outline for local player
        if (isLocal) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        // Draw gun (line indicating direction)
        const gunLength = size;
        const gunEndX = x + Math.cos(angle) * gunLength;
        const gunEndY = y + Math.sin(angle) * gunLength;

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(gunEndX, gunEndY);
        this.ctx.stroke();

        // Draw gun tip
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(gunEndX, gunEndY, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBullet(bullet) {
        const { x, y } = bullet;

        // Draw bullet as small red circle
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // Add glow effect
        this.ctx.strokeStyle = '#ff6666';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    updateUI() {
        // Update player count
        const playerCount = Object.keys(this.players).length;
        document.getElementById('player-count').textContent = playerCount;

        // Update player size
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

        // Hide after 5 seconds
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    }

    flashScreen(color) {
        const originalColor = this.ctx.fillStyle;
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = originalColor;
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
