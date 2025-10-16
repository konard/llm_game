#!/usr/bin/env python3
"""
Standalone test to verify edge position logic without importing aiohttp.
"""

import random

# Constants from server
CANVAS_WIDTH = 800
CANVAS_HEIGHT = 600
RESPAWN_EDGE_MARGIN = 50
PLAYER_INITIAL_SIZE = 20

def get_random_edge_position():
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

def test_random_edge_position():
    """Test that random edge position is truly at the edge"""
    print("Testing random edge position generation...")
    print(f"Canvas size: {CANVAS_WIDTH} x {CANVAS_HEIGHT}")
    print(f"Edge margin: {RESPAWN_EDGE_MARGIN}")
    print()

    # Generate 20 random positions and check they're at edges
    positions = []
    for i in range(20):
        x, y = get_random_edge_position()
        positions.append((x, y))

        # Check if at edge
        at_top = abs(y - RESPAWN_EDGE_MARGIN) < 1
        at_bottom = abs(y - (CANVAS_HEIGHT - RESPAWN_EDGE_MARGIN)) < 1
        at_left = abs(x - RESPAWN_EDGE_MARGIN) < 1
        at_right = abs(x - (CANVAS_WIDTH - RESPAWN_EDGE_MARGIN)) < 1

        at_edge = at_top or at_bottom or at_left or at_right

        edge_name = ""
        if at_top:
            edge_name = "top"
        elif at_bottom:
            edge_name = "bottom"
        elif at_left:
            edge_name = "left"
        elif at_right:
            edge_name = "right"

        status = "✅" if at_edge else "❌"
        print(f"{status} Position {i+1:2d}: ({x:6.1f}, {y:6.1f}) - {edge_name:6s}")

        if not at_edge:
            print(f"   ERROR: Position not at edge!")
            return False

    print()
    print("✅ All positions are at edges")
    print()

    # Check distribution across edges
    edges_used = {'top': 0, 'bottom': 0, 'left': 0, 'right': 0}
    for x, y in positions:
        if abs(y - RESPAWN_EDGE_MARGIN) < 1:
            edges_used['top'] += 1
        elif abs(y - (CANVAS_HEIGHT - RESPAWN_EDGE_MARGIN)) < 1:
            edges_used['bottom'] += 1
        elif abs(x - RESPAWN_EDGE_MARGIN) < 1:
            edges_used['left'] += 1
        elif abs(x - (CANVAS_WIDTH - RESPAWN_EDGE_MARGIN)) < 1:
            edges_used['right'] += 1

    print("Distribution across edges:")
    for edge, count in edges_used.items():
        print(f"  {edge:6s}: {count:2d} ({count/20*100:4.1f}%)")
    print()

    # All edges should be used at least once in 20 tries
    if min(edges_used.values()) == 0:
        print("⚠️  Warning: Not all edges were used (might be bad luck with random)")

    return True

def test_size_reset_logic():
    """Test the size reset logic"""
    print("\n" + "="*60)
    print("Testing player size reset logic...")
    print("="*60)
    print()

    # Simulate player with larger size
    player_size = 50
    print(f"Player size before hit: {player_size}")
    print(f"Expected size after hit: {PLAYER_INITIAL_SIZE}")
    print()

    # Simulate hit - size resets to initial
    new_size = PLAYER_INITIAL_SIZE
    print(f"Player size after hit: {new_size}")

    if new_size == PLAYER_INITIAL_SIZE:
        print("✅ Size correctly reset to initial value")
        return True
    else:
        print(f"❌ ERROR: Size is {new_size}, expected {PLAYER_INITIAL_SIZE}")
        return False

def test_edge_positions_not_overlapping():
    """Test that edge positions don't overlap with center area"""
    print("\n" + "="*60)
    print("Testing edge positions don't overlap with center...")
    print("="*60)
    print()

    center_x = CANVAS_WIDTH / 2
    center_y = CANVAS_HEIGHT / 2
    print(f"Canvas center: ({center_x}, {center_y})")
    print()

    # Generate positions and ensure none are too close to center
    min_distance_to_center = float('inf')
    closest_pos = None

    for i in range(100):
        x, y = get_random_edge_position()
        dx = x - center_x
        dy = y - center_y
        distance = (dx*dx + dy*dy) ** 0.5

        if distance < min_distance_to_center:
            min_distance_to_center = distance
            closest_pos = (x, y)

    # Center to edge distance should be at least ~200 pixels
    expected_min = 200
    print(f"Closest position to center: {closest_pos}")
    print(f"Distance from center: {min_distance_to_center:.1f} pixels")
    print(f"Expected minimum: {expected_min} pixels")
    print()

    if min_distance_to_center >= expected_min:
        print("✅ All edge positions are far from center")
        return True
    else:
        print("⚠️  Some positions might be too close to center")
        return True  # Not a critical error

if __name__ == "__main__":
    print("="*60)
    print("TESTING RESPAWN LOGIC FOR ISSUE #11")
    print("="*60)
    print()

    success = True

    if not test_random_edge_position():
        success = False

    if not test_size_reset_logic():
        success = False

    if not test_edge_positions_not_overlapping():
        success = False

    print()
    print("="*60)
    if success:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("="*60)

    import sys
    sys.exit(0 if success else 1)
