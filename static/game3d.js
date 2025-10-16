/**
 * Client-side 3D game logic for multiplayer tank shooter using Three.js
 */

class Game3D {
    constructor() {
        this.container = document.getElementById('game-canvas-container');
        this.ws = null;
        this.playerId = null;
        this.players = {};
        this.bullets = {};
        this.playerMeshes = {};
        this.bulletMeshes = {};
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
        this.angleUpdateThrottle = 50; // milliseconds
        this.lastPositionUpdateTime = 0;
        this.positionUpdateThrottle = 50; // milliseconds
        this.mouse = { x: 0, y: 0 };
        this.raycaster = new THREE.Raycaster();

        // Click/tap to move state
        this.targetPosition = null;
        this.lastClickTime = 0;
        this.doubleClickThreshold = 300; // milliseconds for double click/tap detection

        // Advanced interpolation state for smooth movement with buffering
        this.playerInterpolation = {}; // Stores interpolation data for each remote player
        this.playerUpdateBuffer = {}; // Buffer to store incoming position updates
        this.lastFrameTime = performance.now();
        this.interpolationDelay = 100; // ms - intentional delay for smooth interpolation

        this.init();
    }

    init() {
        this.setupThreeJS();
        this.setupNameModal();
        this.setupWebSocket();
        this.setupControls();
        this.startGameLoop();
    }

    setupThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        // Create camera (top-down view with slight angle)
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.container.clientWidth / this.container.clientHeight,
            1,
            2000
        );
        this.camera.position.set(400, 500, 400);
        this.camera.lookAt(400, 0, 300);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(400, 600, 400);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Add ground plane
        const groundGeometry = new THREE.PlaneGeometry(800, 600);
        const groundMaterial = new THREE.MeshLambertMaterial({
            color: 0x1a3a1a,
            side: THREE.DoubleSide
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.set(400, 0, 300);
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Add grid helper
        const gridHelper = new THREE.GridHelper(800, 20, 0x4CAF50, 0x2a2a2a);
        gridHelper.position.set(400, 0.1, 300);
        this.scene.add(gridHelper);

        // Add walls
        this.createWalls();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });
    }

    createWalls() {
        const wallHeight = 50;
        const wallThickness = 5;
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });

        // North wall
        const northWall = new THREE.Mesh(
            new THREE.BoxGeometry(800, wallHeight, wallThickness),
            wallMaterial
        );
        northWall.position.set(400, wallHeight / 2, 0);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        this.scene.add(northWall);

        // South wall
        const southWall = new THREE.Mesh(
            new THREE.BoxGeometry(800, wallHeight, wallThickness),
            wallMaterial
        );
        southWall.position.set(400, wallHeight / 2, 600);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        this.scene.add(southWall);

        // West wall
        const westWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, 600),
            wallMaterial
        );
        westWall.position.set(0, wallHeight / 2, 300);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        this.scene.add(westWall);

        // East wall
        const eastWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, 600),
            wallMaterial
        );
        eastWall.position.set(800, wallHeight / 2, 300);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        this.scene.add(eastWall);
    }

    createTankMesh(color, size) {
        const tank = new THREE.Group();
        const scaleFactor = size / 20; // Base size is 20

        // Darken the color slightly for better realism
        const baseColor = new THREE.Color(color);
        const darkerColor = baseColor.clone().multiplyScalar(0.8);
        const trackColor = new THREE.Color(0x2a2a2a);

        // Tank tracks (left side)
        const trackGeometry = new THREE.BoxGeometry(3 * scaleFactor, 5 * scaleFactor, 28 * scaleFactor);
        const trackMaterial = new THREE.MeshLambertMaterial({ color: trackColor });
        const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        leftTrack.position.set(-8 * scaleFactor, 2.5 * scaleFactor, 0);
        leftTrack.castShadow = true;
        leftTrack.receiveShadow = true;
        tank.add(leftTrack);

        // Tank tracks (right side)
        const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        rightTrack.position.set(8 * scaleFactor, 2.5 * scaleFactor, 0);
        rightTrack.castShadow = true;
        rightTrack.receiveShadow = true;
        tank.add(rightTrack);

        // Main body (more elongated and realistic)
        const bodyGeometry = new THREE.BoxGeometry(12 * scaleFactor, 6 * scaleFactor, 26 * scaleFactor);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 6 * scaleFactor;
        body.castShadow = true;
        body.receiveShadow = true;
        tank.add(body);

        // Upper hull section (adds more detail)
        const upperHullGeometry = new THREE.BoxGeometry(10 * scaleFactor, 3 * scaleFactor, 18 * scaleFactor);
        const upperHullMaterial = new THREE.MeshLambertMaterial({ color: darkerColor });
        const upperHull = new THREE.Mesh(upperHullGeometry, upperHullMaterial);
        upperHull.position.y = 10.5 * scaleFactor;
        upperHull.position.z = 2 * scaleFactor; // Slightly forward
        upperHull.castShadow = true;
        upperHull.receiveShadow = true;
        tank.add(upperHull);

        // Tank turret (more realistic proportions)
        const turretGeometry = new THREE.CylinderGeometry(
            6 * scaleFactor,
            7 * scaleFactor,
            5 * scaleFactor,
            16
        );
        const turretMaterial = new THREE.MeshLambertMaterial({ color: color });
        const turret = new THREE.Mesh(turretGeometry, turretMaterial);
        turret.position.y = 14.5 * scaleFactor;
        turret.position.z = 0;
        turret.castShadow = true;
        turret.receiveShadow = true;
        tank.add(turret);

        // Turret top hatch detail
        const hatchGeometry = new THREE.CylinderGeometry(
            2.5 * scaleFactor,
            2.5 * scaleFactor,
            1 * scaleFactor,
            8
        );
        const hatchMaterial = new THREE.MeshLambertMaterial({ color: darkerColor });
        const hatch = new THREE.Mesh(hatchGeometry, hatchMaterial);
        hatch.position.y = 17.5 * scaleFactor;
        hatch.position.z = -2 * scaleFactor;
        hatch.castShadow = true;
        tank.add(hatch);

        // Tank barrel (gun) - longer and more prominent
        const barrelGeometry = new THREE.CylinderGeometry(
            1.2 * scaleFactor,
            1.5 * scaleFactor,
            20 * scaleFactor,
            12
        );
        const barrelMaterial = new THREE.MeshLambertMaterial({
            color: 0x1a1a1a,
            emissive: 0x0a0a0a
        });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.y = 14.5 * scaleFactor;
        barrel.position.z = -14 * scaleFactor;
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        tank.add(barrel);

        // Barrel muzzle brake (realistic detail)
        const muzzleGeometry = new THREE.CylinderGeometry(
            1.8 * scaleFactor,
            1.8 * scaleFactor,
            2 * scaleFactor,
            8
        );
        const muzzleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const muzzle = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.y = 14.5 * scaleFactor;
        muzzle.position.z = -24 * scaleFactor;
        muzzle.castShadow = true;
        tank.add(muzzle);

        // Front armor plate (angled for realism)
        const frontArmorGeometry = new THREE.BoxGeometry(12 * scaleFactor, 5 * scaleFactor, 2 * scaleFactor);
        const frontArmorMaterial = new THREE.MeshLambertMaterial({ color: darkerColor });
        const frontArmor = new THREE.Mesh(frontArmorGeometry, frontArmorMaterial);
        frontArmor.position.y = 7 * scaleFactor;
        frontArmor.position.z = -14 * scaleFactor;
        frontArmor.rotation.x = -0.3; // Slight angle
        frontArmor.castShadow = true;
        frontArmor.receiveShadow = true;
        tank.add(frontArmor);

        // Rear armor plate
        const rearArmorGeometry = new THREE.BoxGeometry(12 * scaleFactor, 5 * scaleFactor, 1.5 * scaleFactor);
        const rearArmorMaterial = new THREE.MeshLambertMaterial({ color: darkerColor });
        const rearArmor = new THREE.Mesh(rearArmorGeometry, rearArmorMaterial);
        rearArmor.position.y = 7 * scaleFactor;
        rearArmor.position.z = 13.5 * scaleFactor;
        rearArmor.castShadow = true;
        rearArmor.receiveShadow = true;
        tank.add(rearArmor);

        // Store references for later use
        tank.userData.body = body;
        tank.userData.turret = turret;
        tank.userData.barrel = barrel;
        tank.userData.scaleFactor = scaleFactor;

        return tank;
    }

    updateTankScale(tank, newSize) {
        const scaleFactor = newSize / 20;
        const oldScaleFactor = tank.userData.scaleFactor;
        const scaleRatio = scaleFactor / oldScaleFactor;

        // Update all parts
        tank.children.forEach(child => {
            child.scale.multiplyScalar(scaleRatio);
            child.position.multiplyScalar(scaleRatio);
        });

        tank.userData.scaleFactor = scaleFactor;
    }

    createBulletMesh() {
        const bulletGeometry = new THREE.SphereGeometry(3, 8, 8);
        const bulletMaterial = new THREE.MeshLambertMaterial({
            color: 0xff0000,
            emissive: 0x660000
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.castShadow = true;
        return bullet;
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
                            this.flashScreen();
                        }
                    });
                }
                break;

            case 'player_joined':
                this.players[message.player_id] = message.player;
                console.log('Player joined:', message.player_id);
                break;

            case 'player_left':
                // Remove mesh from scene
                if (this.playerMeshes[message.player_id]) {
                    this.scene.remove(this.playerMeshes[message.player_id]);
                    delete this.playerMeshes[message.player_id];
                }
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

        // Mouse control for rotation
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (!this.playerId) return;

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            // Calculate world position of mouse
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.ground);

            if (intersects.length > 0) {
                const point = intersects[0].point;
                const dx = point.x - this.localPlayer.x;
                const dz = point.z - this.localPlayer.y;
                // Calculate angle in the XZ plane
                // This angle is used by the server for bullet direction (0 = +X, π/2 = +Z)
                const newAngle = Math.atan2(dz, dx);

                if (this.localPlayer.angle !== newAngle) {
                    this.localPlayer.angle = newAngle;

                    const now = Date.now();
                    if (now - this.lastAngleUpdateTime >= this.angleUpdateThrottle) {
                        this.lastAngleUpdateTime = now;
                        this.sendAngleUpdate();
                    }
                }
            }

            this.checkPlayerHover(e.clientX, e.clientY);
        });

        // Click/tap to move, double-click/tap to shoot
        this.renderer.domElement.addEventListener('click', (e) => {
            const now = Date.now();
            const timeSinceLastClick = now - this.lastClickTime;

            if (timeSinceLastClick < this.doubleClickThreshold) {
                // Double click - shoot
                this.shoot();
                this.lastClickTime = 0; // Reset to prevent triple-click issues
                this.targetPosition = null; // Cancel movement on shoot
            } else {
                // Single click - set target position to move towards
                const rect = this.renderer.domElement.getBoundingClientRect();
                const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                // Calculate world position
                this.raycaster.setFromCamera({ x: mouseX, y: mouseY }, this.camera);
                const intersects = this.raycaster.intersectObject(this.ground);

                if (intersects.length > 0) {
                    const point = intersects[0].point;
                    this.targetPosition = { x: point.x, y: point.z };
                    this.lastClickTime = now;
                }
            }
        });

        // Touch events for mobile
        this.renderer.domElement.addEventListener('touchstart', (e) => {
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
                const rect = this.renderer.domElement.getBoundingClientRect();
                const touch = e.touches[0];
                const touchX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
                const touchY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

                // Calculate world position
                this.raycaster.setFromCamera({ x: touchX, y: touchY }, this.camera);
                const intersects = this.raycaster.intersectObject(this.ground);

                if (intersects.length > 0) {
                    const point = intersects[0].point;
                    this.targetPosition = { x: point.x, y: point.z };
                    this.lastClickTime = now;
                }
            }
        });
    }

    startGameLoop() {
        const loop = (currentTime) => {
            const deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;

            this.update();
            this.updateInterpolation(deltaTime);
            this.render3D();
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

        this.localPlayer.x = Math.max(0, Math.min(this.config.canvas_width, this.localPlayer.x));
        this.localPlayer.y = Math.max(0, Math.min(this.config.canvas_height, this.localPlayer.y));

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

    checkPlayerHover(screenX, screenY) {
        const tooltip = document.getElementById('player-tooltip');
        this.raycaster.setFromCamera(this.mouse, this.camera);

        let hoveredPlayerId = null;

        // Check intersection with player meshes
        for (const [id, mesh] of Object.entries(this.playerMeshes)) {
            const intersects = this.raycaster.intersectObject(mesh, true);
            if (intersects.length > 0 && this.players[id]) {
                hoveredPlayerId = id;
                tooltip.textContent = this.players[id].name || id;
                tooltip.style.display = 'block';
                tooltip.style.left = `${screenX + 10}px`;
                tooltip.style.top = `${screenY + 10}px`;
                break;
            }
        }

        if (!hoveredPlayerId) {
            tooltip.style.display = 'none';
        }

        this.hoveredPlayer = hoveredPlayerId;
    }

    render3D() {
        // Update player meshes
        for (const [id, player] of Object.entries(this.players)) {
            if (!this.playerMeshes[id]) {
                // Create new tank mesh
                this.playerMeshes[id] = this.createTankMesh(player.color, player.size);
                this.scene.add(this.playerMeshes[id]);
            }

            const mesh = this.playerMeshes[id];
            mesh.position.x = player.x;
            mesh.position.z = player.y;
            // Adjust rotation to account for tank barrel pointing along -Z axis when rotation.y = 0
            // The server uses angle where 0 = +X direction, π/2 = +Z direction
            // We need to rotate the tank so barrel points from -Z (at rotation.y=0) to the correct direction
            mesh.rotation.y = -(player.angle + Math.PI / 2);

            // Update scale if size changed
            const expectedScaleFactor = player.size / 20;
            if (Math.abs(mesh.userData.scaleFactor - expectedScaleFactor) > 0.01) {
                this.updateTankScale(mesh, player.size);
            }

            // Highlight local player
            if (id === this.playerId) {
                mesh.userData.body.material.emissive = new THREE.Color(0x333333);
            }
        }

        // Remove meshes for players that left
        for (const id in this.playerMeshes) {
            if (!this.players[id]) {
                this.scene.remove(this.playerMeshes[id]);
                delete this.playerMeshes[id];
            }
        }

        // Update bullet meshes
        for (const [id, bullet] of Object.entries(this.bullets)) {
            if (!this.bulletMeshes[id]) {
                this.bulletMeshes[id] = this.createBulletMesh();
                this.scene.add(this.bulletMeshes[id]);
            }

            const mesh = this.bulletMeshes[id];
            mesh.position.x = bullet.x;
            mesh.position.y = 5;
            mesh.position.z = bullet.y;
        }

        // Remove meshes for bullets that no longer exist
        for (const id in this.bulletMeshes) {
            if (!this.bullets[id]) {
                this.scene.remove(this.bulletMeshes[id]);
                delete this.bulletMeshes[id];
            }
        }

        // Update UI
        this.updateUI();

        // Render scene
        this.renderer.render(this.scene, this.camera);
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

    flashScreen() {
        // Flash the screen red by temporarily changing background
        const originalColor = this.scene.background;
        this.scene.background = new THREE.Color(0x330000);
        setTimeout(() => {
            this.scene.background = originalColor;
        }, 100);
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new Game3D();
});
