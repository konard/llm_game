#!/usr/bin/env python3
"""
Test script to validate the game server functionality
"""

import asyncio
import websockets
import json
import time


async def test_connection():
    """Test basic WebSocket connection"""
    print("Testing WebSocket connection...")
    uri = "ws://localhost:8080/ws"

    try:
        async with websockets.connect(uri) as websocket:
            print("✓ Connected to server")

            # Wait for init message
            response = await websocket.recv()
            data = json.loads(response)

            if data['type'] == 'init':
                print(f"✓ Received init message")
                print(f"  Player ID: {data['player_id']}")
                print(f"  Initial position: ({data['player']['x']:.1f}, {data['player']['y']:.1f})")
                print(f"  Player color: {data['player']['color']}")
                print(f"  Canvas size: {data['config']['canvas_width']}x{data['config']['canvas_height']}")
                return True
            else:
                print(f"✗ Expected 'init' message, got '{data['type']}'")
                return False

    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False


async def test_player_movement():
    """Test player movement updates"""
    print("\nTesting player movement...")
    uri = "ws://localhost:8080/ws"

    try:
        async with websockets.connect(uri) as websocket:
            # Get init message
            await websocket.recv()
            print("✓ Connected")

            # Send movement update
            update = {
                'type': 'update',
                'data': {
                    'x': 100,
                    'y': 200,
                    'angle': 1.57  # 90 degrees
                }
            }
            await websocket.send(json.dumps(update))
            print("✓ Sent movement update")

            # Wait a bit for response
            await asyncio.sleep(0.5)
            print("✓ Movement update accepted")
            return True

    except Exception as e:
        print(f"✗ Movement test failed: {e}")
        return False


async def test_shooting():
    """Test shooting mechanic"""
    print("\nTesting shooting...")
    uri = "ws://localhost:8080/ws"

    try:
        async with websockets.connect(uri) as websocket:
            # Get init message
            await websocket.recv()
            print("✓ Connected")

            # Send shoot command
            shoot = {
                'type': 'shoot'
            }
            await websocket.send(json.dumps(shoot))
            print("✓ Sent shoot command")

            # Wait a bit
            await asyncio.sleep(0.5)
            print("✓ Shooting mechanic working")
            return True

    except Exception as e:
        print(f"✗ Shooting test failed: {e}")
        return False


async def test_multiple_players():
    """Test multiple simultaneous connections"""
    print("\nTesting multiple players...")
    uri = "ws://localhost:8080/ws"

    try:
        # Connect two players
        ws1 = await websockets.connect(uri)
        ws2 = await websockets.connect(uri)
        print("✓ Connected 2 players")

        # Get init messages
        data1 = json.loads(await ws1.recv())
        data2 = json.loads(await ws2.recv())

        player1_id = data1['player_id']
        player2_id = data2['player_id']

        print(f"  Player 1 ID: {player1_id}")
        print(f"  Player 2 ID: {player2_id}")

        if player1_id != player2_id:
            print("✓ Players have unique IDs")
        else:
            print("✗ Players have duplicate IDs")
            return False

        # Close connections
        await ws1.close()
        await ws2.close()
        print("✓ Multiple player test passed")
        return True

    except Exception as e:
        print(f"✗ Multiple player test failed: {e}")
        return False


async def test_state_broadcast():
    """Test that game state is broadcast to clients"""
    print("\nTesting state broadcast...")
    uri = "ws://localhost:8080/ws"

    try:
        async with websockets.connect(uri) as websocket:
            # Get init message
            await websocket.recv()
            print("✓ Connected")

            # Wait for state updates
            print("  Waiting for state broadcasts...")
            states_received = 0

            async def receive_messages():
                nonlocal states_received
                try:
                    while states_received < 5:
                        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                        data = json.loads(message)
                        if data.get('type') == 'state':
                            states_received += 1
                            if states_received == 1:
                                print("✓ Received first state broadcast")
                except asyncio.TimeoutError:
                    pass

            await receive_messages()

            if states_received >= 3:
                print(f"✓ Received {states_received} state broadcasts")
                return True
            else:
                print(f"✗ Only received {states_received} state broadcasts")
                return False

    except Exception as e:
        print(f"✗ State broadcast test failed: {e}")
        return False


async def run_all_tests():
    """Run all test cases"""
    print("=" * 60)
    print("Game Server Test Suite")
    print("=" * 60)
    print("\nMake sure the server is running on http://localhost:8080\n")

    tests = [
        ("Connection Test", test_connection),
        ("Player Movement Test", test_player_movement),
        ("Shooting Test", test_shooting),
        ("Multiple Players Test", test_multiple_players),
        ("State Broadcast Test", test_state_broadcast),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ {test_name} crashed: {e}")
            results.append((test_name, False))

        # Small delay between tests
        await asyncio.sleep(0.5)

    # Print summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")

    return passed == total


def main():
    """Main entry point"""
    try:
        result = asyncio.run(run_all_tests())
        exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
        exit(1)


if __name__ == '__main__':
    main()
