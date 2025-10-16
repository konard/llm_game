# Test Plan: Player Names Feature

## Implementation Summary

Added player names functionality with the following features:
1. Default naming (player1, player2, etc.)
2. Name input modal on connection
3. Name tooltips on hover over player circles

## Changes Made

### Server-side (server/game_server.py)
- Added `name` field to `Player` dataclass
- Added `player_counter` to `GameState` for sequential naming
- Implemented `update_player_name()` method for name validation and updates
- Added `change_name` message handler in websocket handler
- Broadcasts `player_name_changed` to all clients when name updates

### Client-side (static/index.html)
- Added name input modal dialog with styling
- Added tooltip element for displaying player names on hover
- Modal appears on page load, pre-filled with default name

### Client-side (static/game.js)
- Added `name` field to `localPlayer`
- Added `hoveredPlayer` tracking
- Implemented `setupNameModal()` for modal interaction
- Implemented `sendNameChange()` to send name updates to server
- Added `player_name_changed` message handler
- Implemented `checkPlayerHover()` to detect mouse over players and show tooltips
- Pre-fills modal input with default name from server

## Test Cases

### 1. Default Name Assignment
**Steps:**
1. Start server: `python server/game_server.py`
2. Open first browser tab: `http://localhost:8080`
3. Check modal shows "player1" as default
4. Click "Начать игру" without changing name
5. Open second browser tab
6. Check modal shows "player2" as default

**Expected:**
- ✅ First player gets "player1"
- ✅ Second player gets "player2"
- ✅ Names increment sequentially

### 2. Custom Name Entry
**Steps:**
1. Open browser: `http://localhost:8080`
2. Enter "TestPlayer" in name input
3. Click "Начать игру" or press Enter
4. Modal should close and game starts

**Expected:**
- ✅ Modal closes when name is submitted
- ✅ Custom name is used instead of default
- ✅ Name is visible to all other players (test with second tab)

### 3. Empty Name Handling
**Steps:**
1. Open browser: `http://localhost:8080`
2. Clear the default name from input
3. Click "Начать игру"

**Expected:**
- ✅ Uses default name (player1, etc.) if input is empty

### 4. Name Tooltip Display
**Steps:**
1. Open two browser tabs
2. Set different names for each player
3. In first tab, hover mouse over the second player's circle

**Expected:**
- ✅ Tooltip appears near cursor showing player name
- ✅ Tooltip follows cursor when moving over player
- ✅ Tooltip disappears when cursor leaves player circle
- ✅ Tooltip shows correct name for each player

### 5. Name Visibility to All Players
**Steps:**
1. Open three browser tabs
2. Set names: "Alice", "Bob", "Charlie"
3. In each tab, hover over other players

**Expected:**
- ✅ All players can see all other players' names
- ✅ Names update in real-time when changed

### 6. Name Validation
**Steps:**
1. Try entering a very long name (>20 characters)
2. Try entering special characters

**Expected:**
- ✅ Input is limited to 20 characters (maxlength attribute)
- ✅ Server validates and rejects invalid names

### 7. Connection Flow
**Steps:**
1. Open browser
2. Leave modal open without entering name
3. Wait for WebSocket connection
4. Enter name and click submit

**Expected:**
- ✅ Name is sent to server after connection established
- ✅ If name is entered before connection, it's sent once connected

## Manual Testing Instructions

```bash
# Terminal 1: Start server
cd /tmp/gh-issue-solver-1760623944486
python server/game_server.py

# Terminal 2: Open browser (or use GUI browser)
# Navigate to http://localhost:8080
```

Then test each case above.

## Expected Behavior Summary

- ✅ Modal appears on connect with default name pre-filled
- ✅ Players can customize their names
- ✅ Empty names fall back to default
- ✅ Names are visible on hover over player circles
- ✅ Names sync across all connected clients
- ✅ Sequential default naming (player1, player2, ...)
