#!/usr/bin/env python3
"""
Simple browser-based multiplayer game server with WebSocket support.
Players are represented as colored circles that can move and shoot at each other.
"""

import asyncio
import json
import random
import time
import logging
from typing import Dict, Set, Optional
from dataclasses import dataclass, asdict
from aiohttp import web
import aiohttp
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
MAX_SESSIONS = 50  # Session limit
CANVAS_WIDTH = 800
CANVAS_HEIGHT = 600
PLAYER_INITIAL_SIZE = 20
PLAYER_MAX_SIZE = 100
PLAYER_GROWTH_RATE = 0.1  # Size increase per second
PLAYER_SPEED = 5
BULLET_SPEED = 10
BULLET_SIZE = 5
HIT_SIZE_REDUCTION = 10
RESPAWN_EDGE_MARGIN = 50  # Distance from edge for respawn


@dataclass
class Player:
    """Represents a player in the game"""
    id: str
    name: str
    x: float
    y: float
    angle: float
    size: float
    color: str
    last_update: float


@dataclass
class Bullet:
    """Represents a bullet in the game"""
    id: str
    x: float
    y: float
    vx: float
    vy: float
    owner_id: str
    created_at: float


class GameState:
    """Manages the game state including players and bullets"""

    def __init__(self):
        self.players: Dict[str, Player] = {}
        self.bullets: Dict[str, Bullet] = {}
        self.connections: Dict[str, web.WebSocketResponse] = {}
        self.bullet_counter = 0
        self.player_counter = 0

    def get_random_edge_position(self) -> tuple:
        """Generate a random position at the edge of the game area"""
        edge = random.choice(['top', 'bottom', 'left', 'right'])

        if edge == 'top':
            x = random.uniform(RESPAWN_EDGE_MARGIN, CANVAS_WIDTH - RESPAWN_EDGE_MARGIN)
            y = RESPAWN_EDGE_MARGIN
        elif edge == 'bottom':
            x = random.uniform(RESPAWN_EDGE_MARGIN, CANVAS_WIDTH - RESPAWN_EDGE_MARGIN)
            y = CANVAS_HEIGHT - RESPAWN_EDGE_MARGIN
        elif edge == 'left':
            x = RESPAWN_EDGE_MARGIN
            y = random.uniform(RESPAWN_EDGE_MARGIN, CANVAS_HEIGHT - RESPAWN_EDGE_MARGIN)
        else:  # right
            x = CANVAS_WIDTH - RESPAWN_EDGE_MARGIN
            y = random.uniform(RESPAWN_EDGE_MARGIN, CANVAS_HEIGHT - RESPAWN_EDGE_MARGIN)

        return x, y

    def add_player(self, player_id: str, ws: web.WebSocketResponse) -> Player:
        """Add a new player to the game"""
        if len(self.players) >= MAX_SESSIONS:
            raise ValueError("Server is full")

        # Generate default player name
        self.player_counter += 1
        default_name = f"player{self.player_counter}"

        # Random spawn position and color
        x = random.uniform(100, CANVAS_WIDTH - 100)
        y = random.uniform(100, CANVAS_HEIGHT - 100)
        color = "#{:06x}".format(random.randint(0, 0xFFFFFF))

        player = Player(
            id=player_id,
            name=default_name,
            x=x,
            y=y,
            angle=0,
            size=PLAYER_INITIAL_SIZE,
            color=color,
            last_update=time.time()
        )

        self.players[player_id] = player
        self.connections[player_id] = ws
        logger.info(f"Player {player_id} ({default_name}) joined. Total players: {len(self.players)}")
        return player

    def remove_player(self, player_id: str):
        """Remove a player from the game"""
        if player_id in self.players:
            del self.players[player_id]
        if player_id in self.connections:
            del self.connections[player_id]
        logger.info(f"Player {player_id} left. Total players: {len(self.players)}")

    def update_player(self, player_id: str, data: dict):
        """Update player position and angle"""
        if player_id not in self.players:
            return

        player = self.players[player_id]

        if 'x' in data:
            player.x = max(0, min(CANVAS_WIDTH, data['x']))
        if 'y' in data:
            player.y = max(0, min(CANVAS_HEIGHT, data['y']))
        if 'angle' in data:
            player.angle = data['angle']

        player.last_update = time.time()

    def update_player_name(self, player_id: str, name: str):
        """Update player name"""
        if player_id not in self.players:
            return False

        # Validate and sanitize name
        name = name.strip()
        if not name or len(name) > 20:
            return False

        self.players[player_id].name = name
        logger.info(f"Player {player_id} changed name to: {name}")
        return True

    def create_bullet(self, player_id: str):
        """Create a bullet from a player"""
        if player_id not in self.players:
            return None

        player = self.players[player_id]
        self.bullet_counter += 1
        bullet_id = f"{player_id}_{self.bullet_counter}"

        # Calculate bullet velocity based on player angle
        import math
        vx = math.cos(player.angle) * BULLET_SPEED
        vy = math.sin(player.angle) * BULLET_SPEED

        # Spawn bullet at the edge of player circle (gun position)
        bullet_x = player.x + math.cos(player.angle) * player.size
        bullet_y = player.y + math.sin(player.angle) * player.size

        bullet = Bullet(
            id=bullet_id,
            x=bullet_x,
            y=bullet_y,
            vx=vx,
            vy=vy,
            owner_id=player_id,
            created_at=time.time()
        )

        self.bullets[bullet_id] = bullet
        return bullet

    def update_bullets(self):
        """Update bullet positions and remove out-of-bounds bullets"""
        current_time = time.time()
        bullets_to_remove = []

        for bullet_id, bullet in self.bullets.items():
            bullet.x += bullet.vx
            bullet.y += bullet.vy

            # Remove bullets that are out of bounds or too old (5 seconds)
            if (bullet.x < 0 or bullet.x > CANVAS_WIDTH or
                bullet.y < 0 or bullet.y > CANVAS_HEIGHT or
                current_time - bullet.created_at > 5):
                bullets_to_remove.append(bullet_id)

        for bullet_id in bullets_to_remove:
            del self.bullets[bullet_id]

    def check_collisions(self):
        """Check for bullet-player collisions"""
        import math
        hits = []

        for bullet_id, bullet in list(self.bullets.items()):
            for player_id, player in self.players.items():
                # Don't check collision with bullet owner
                if bullet.owner_id == player_id:
                    continue

                # Calculate distance between bullet and player
                dx = bullet.x - player.x
                dy = bullet.y - player.y
                distance = math.sqrt(dx * dx + dy * dy)

                # Check if bullet hit the player
                if distance < player.size:
                    hits.append({
                        'bullet_id': bullet_id,
                        'player_id': player_id,
                        'shooter_id': bullet.owner_id
                    })

        # Process hits
        for hit in hits:
            # Remove bullet
            if hit['bullet_id'] in self.bullets:
                del self.bullets[hit['bullet_id']]

            # Reset player size to initial value and respawn at random edge position
            player = self.players[hit['player_id']]
            player.size = PLAYER_INITIAL_SIZE

            # Move player to random edge position
            player.x, player.y = self.get_random_edge_position()

        return hits

    def grow_players(self):
        """Gradually increase player sizes over time"""
        current_time = time.time()

        for player in self.players.values():
            time_delta = current_time - player.last_update
            if time_delta > 0:
                growth = PLAYER_GROWTH_RATE * time_delta
                player.size = min(PLAYER_MAX_SIZE, player.size + growth)
                player.last_update = current_time

    def get_state(self) -> dict:
        """Get the current game state for broadcasting"""
        return {
            'players': {pid: asdict(p) for pid, p in self.players.items()},
            'bullets': {bid: asdict(b) for bid, b in self.bullets.items()}
        }

    async def broadcast(self, message: dict, exclude: Optional[str] = None):
        """Broadcast a message to all connected clients"""
        if not self.connections:
            return

        message_str = json.dumps(message)
        dead_connections = []

        for player_id, ws in self.connections.items():
            if exclude and player_id == exclude:
                continue

            try:
                await ws.send_str(message_str)
            except Exception as e:
                logger.error(f"Error broadcasting to {player_id}: {e}")
                dead_connections.append(player_id)

        # Clean up dead connections
        for player_id in dead_connections:
            self.remove_player(player_id)


# Global game state
game = GameState()


async def game_loop():
    """Main game loop that updates game state and broadcasts to clients"""
    while True:
        try:
            # Update game state
            game.update_bullets()
            game.grow_players()
            hits = game.check_collisions()

            # Broadcast game state to all clients
            state = game.get_state()
            await game.broadcast({
                'type': 'state',
                'data': state,
                'hits': hits
            })

            # Run at ~60 FPS for smoother movement
            await asyncio.sleep(1/60)

        except Exception as e:
            logger.error(f"Error in game loop: {e}")
            await asyncio.sleep(1)


async def websocket_handler(request):
    """Handle WebSocket connections from clients"""
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    player_id = None

    try:
        # Generate unique player ID
        player_id = f"player_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"

        # Add player to game
        try:
            player = game.add_player(player_id, ws)
        except ValueError as e:
            await ws.send_json({'type': 'error', 'message': str(e)})
            await ws.close()
            return ws

        # Send initial state to new player
        await ws.send_json({
            'type': 'init',
            'player_id': player_id,
            'player': asdict(player),
            'config': {
                'canvas_width': CANVAS_WIDTH,
                'canvas_height': CANVAS_HEIGHT,
                'player_speed': PLAYER_SPEED
            }
        })

        # Broadcast new player to others
        await game.broadcast({
            'type': 'player_joined',
            'player_id': player_id,
            'player': asdict(player)
        }, exclude=player_id)

        # Handle incoming messages
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    msg_type = data.get('type')

                    if msg_type == 'update':
                        game.update_player(player_id, data.get('data', {}))

                    elif msg_type == 'shoot':
                        bullet = game.create_bullet(player_id)
                        if bullet:
                            await game.broadcast({
                                'type': 'bullet_created',
                                'bullet': asdict(bullet)
                            })

                    elif msg_type == 'change_name':
                        new_name = data.get('name', '')
                        if game.update_player_name(player_id, new_name):
                            # Broadcast name change to all players
                            await game.broadcast({
                                'type': 'player_name_changed',
                                'player_id': player_id,
                                'name': new_name
                            })
                        else:
                            await ws.send_json({
                                'type': 'error',
                                'message': 'Invalid name'
                            })

                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from {player_id}")

            elif msg.type == aiohttp.WSMsgType.ERROR:
                logger.error(f"WebSocket error from {player_id}: {ws.exception()}")

    finally:
        # Clean up when player disconnects
        if player_id:
            game.remove_player(player_id)
            await game.broadcast({
                'type': 'player_left',
                'player_id': player_id
            })

    return ws


async def index_handler(request):
    """Serve the main game page"""
    static_dir = os.path.join(os.path.dirname(__file__), '..', 'static')
    index_path = os.path.join(static_dir, 'index.html')
    return web.FileResponse(index_path)


async def init_app():
    """Initialize the web application"""
    app = web.Application()

    # Routes
    app.router.add_get('/', index_handler)
    app.router.add_get('/ws', websocket_handler)

    # Static files
    static_dir = os.path.join(os.path.dirname(__file__), '..', 'static')
    app.router.add_static('/static/', static_dir, name='static')

    # Start game loop
    asyncio.create_task(game_loop())

    return app


def main():
    """Main entry point"""
    logger.info("Starting game server...")
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Server will listen on port {port}")
    app = init_app()
    web.run_app(app, host='0.0.0.0', port=port)


if __name__ == '__main__':
    main()
