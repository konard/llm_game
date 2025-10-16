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
            color: '#ffffff'
        };
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

        this.init();
    }

    init() {
        this.setupWebSocket();
        this.setupControls();
        this.startGameLoop();
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Connected to server');
            this.updateStatus('Connected', true);
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
                break;

            case 'state':
                this.players = message.data.players;
                this.bullets = message.data.bullets;

                // Update local player reference
                if (this.playerId && this.players[this.playerId]) {
                    this.localPlayer = this.players[this.playerId];
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
                console.log('Player left:', message.player_id);
                break;

            case 'bullet_created':
                this.bullets[message.bullet.id] = message.bullet;
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
        });

        // Click to shoot
        this.canvas.addEventListener('click', () => {
            this.shoot();
        });
    }

    startGameLoop() {
        const loop = () => {
            this.update();
            this.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update() {
        if (!this.playerId || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        // Handle movement
        let moved = false;
        const speed = this.config.player_speed;

        if (this.keys.ArrowUp) {
            this.localPlayer.y -= speed;
            moved = true;
        }
        if (this.keys.ArrowDown) {
            this.localPlayer.y += speed;
            moved = true;
        }
        if (this.keys.ArrowLeft) {
            this.localPlayer.x -= speed;
            moved = true;
        }
        if (this.keys.ArrowRight) {
            this.localPlayer.x += speed;
            moved = true;
        }

        // Clamp position to canvas bounds
        this.localPlayer.x = Math.max(0, Math.min(this.config.canvas_width, this.localPlayer.x));
        this.localPlayer.y = Math.max(0, Math.min(this.config.canvas_height, this.localPlayer.y));

        // Send update to server if moved or angle changed
        if (moved) {
            this.sendUpdate();
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
