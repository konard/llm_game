#!/usr/bin/env python3
"""
Experiment script to simulate a player bot for testing
"""

import asyncio
import websockets
import json
import random
import math


class PlayerBot:
    """A simple bot that connects and plays the game"""

    def __init__(self, name="Bot"):
        self.name = name
        self.ws = None
        self.player_id = None
        self.x = 0
        self.y = 0
        self.angle = 0
        self.canvas_width = 800
        self.canvas_height = 600
        self.running = False

    async def connect(self, uri="ws://localhost:8080/ws"):
        """Connect to the game server"""
        self.ws = await websockets.connect(uri)
        print(f"[{self.name}] Connected to server")

        # Receive init message
        message = await self.ws.recv()
        data = json.loads(message)

        if data['type'] == 'init':
            self.player_id = data['player_id']
            self.x = data['player']['x']
            self.y = data['player']['y']
            self.canvas_width = data['config']['canvas_width']
            self.canvas_height = data['config']['canvas_height']
            print(f"[{self.name}] Initialized as {self.player_id}")
            print(f"[{self.name}] Starting position: ({self.x:.1f}, {self.y:.1f})")

    async def random_movement(self):
        """Move randomly around the canvas"""
        while self.running:
            # Random movement
            dx = random.uniform(-10, 10)
            dy = random.uniform(-10, 10)

            self.x = max(0, min(self.canvas_width, self.x + dx))
            self.y = max(0, min(self.canvas_height, self.y + dy))

            # Random angle
            self.angle = random.uniform(0, 2 * math.pi)

            # Send update
            await self.ws.send(json.dumps({
                'type': 'update',
                'data': {
                    'x': self.x,
                    'y': self.y,
                    'angle': self.angle
                }
            }))

            # Random shooting
            if random.random() < 0.3:  # 30% chance to shoot
                await self.ws.send(json.dumps({'type': 'shoot'}))
                print(f"[{self.name}] Shooting!")

            await asyncio.sleep(random.uniform(0.5, 2.0))

    async def circular_movement(self):
        """Move in a circular pattern"""
        center_x = self.canvas_width / 2
        center_y = self.canvas_height / 2
        radius = 150
        angle_step = 0.1

        current_angle = 0

        while self.running:
            # Calculate position on circle
            self.x = center_x + radius * math.cos(current_angle)
            self.y = center_y + radius * math.sin(current_angle)
            self.angle = current_angle + math.pi / 2  # Face forward

            # Send update
            await self.ws.send(json.dumps({
                'type': 'update',
                'data': {
                    'x': self.x,
                    'y': self.y,
                    'angle': self.angle
                }
            }))

            # Occasional shooting
            if random.random() < 0.2:
                await self.ws.send(json.dumps({'type': 'shoot'}))
                print(f"[{self.name}] Shooting!")

            current_angle += angle_step
            await asyncio.sleep(0.1)

    async def listen_for_messages(self):
        """Listen for server messages"""
        try:
            async for message in self.ws:
                data = json.loads(message)

                if data['type'] == 'state':
                    # Log player count
                    player_count = len(data['data']['players'])
                    if random.random() < 0.05:  # Log occasionally
                        print(f"[{self.name}] Players in game: {player_count}")

                elif data['type'] == 'player_joined':
                    print(f"[{self.name}] New player joined: {data['player_id']}")

                elif data['type'] == 'player_left':
                    print(f"[{self.name}] Player left: {data['player_id']}")

        except websockets.exceptions.ConnectionClosed:
            print(f"[{self.name}] Connection closed")
            self.running = False

    async def run(self, movement_type="random"):
        """Run the bot"""
        self.running = True

        # Start listening for messages
        listen_task = asyncio.create_task(self.listen_for_messages())

        # Start movement
        if movement_type == "circular":
            movement_task = asyncio.create_task(self.circular_movement())
        else:
            movement_task = asyncio.create_task(self.random_movement())

        try:
            await asyncio.gather(listen_task, movement_task)
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
        finally:
            self.running = False
            if self.ws:
                await self.ws.close()

    async def stop(self):
        """Stop the bot"""
        self.running = False
        if self.ws:
            await self.ws.close()


async def run_single_bot(bot_id=1, movement_type="random"):
    """Run a single bot"""
    bot = PlayerBot(f"Bot-{bot_id}")

    try:
        await bot.connect()
        await bot.run(movement_type)
    except Exception as e:
        print(f"[Bot-{bot_id}] Failed: {e}")


async def run_multiple_bots(num_bots=3):
    """Run multiple bots simultaneously"""
    print(f"Starting {num_bots} bots...")

    tasks = []
    for i in range(num_bots):
        movement = "circular" if i % 2 == 0 else "random"
        task = asyncio.create_task(run_single_bot(i + 1, movement))
        tasks.append(task)
        await asyncio.sleep(0.5)  # Stagger connections

    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        print("\nStopping bots...")


def main():
    """Main entry point"""
    import sys

    if len(sys.argv) > 1:
        try:
            num_bots = int(sys.argv[1])
        except ValueError:
            print("Usage: python simulate_player.py [num_bots]")
            print("Example: python simulate_player.py 5")
            return
    else:
        num_bots = 1

    print("=" * 60)
    print(f"Player Bot Simulator - Running {num_bots} bot(s)")
    print("=" * 60)
    print("Press Ctrl+C to stop\n")

    try:
        asyncio.run(run_multiple_bots(num_bots))
    except KeyboardInterrupt:
        print("\nShutdown complete")


if __name__ == '__main__':
    main()
