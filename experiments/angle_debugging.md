# Angle Debugging for 3D Tank Game

## Coordinate Systems

### 2D Game (canvas)
- X axis: left (0) to right (800)
- Y axis: top (0) to bottom (600)
- Angle = 0 → pointing RIGHT (+X)
- Angle = π/2 → pointing DOWN (+Y)

### 3D Game (Three.js)
- X axis: left (0) to right (800)
- Z axis: top (0) to bottom (600) [maps to Y in 2D]
- Y axis: vertical (up/down in 3D space)

### Tank Barrel Orientation (3D)
- When `rotation.y = 0`: barrel points in **-Z direction** (forward/up on screen)
- When `rotation.y = π/2`: barrel points in **-X direction** (left on screen)
- When `rotation.y = -π/2`: barrel points in **+X direction** (right on screen)
- When `rotation.y = π`: barrel points in **+Z direction** (backward/down on screen)

## Server Bullet Calculation
```python
vx = cos(angle) * BULLET_SPEED
vy = sin(angle) * BULLET_SPEED
```
- angle = 0 → vx=1, vy=0 → bullet goes RIGHT in 2D (+X)
- angle = π/2 → vx=0, vy=1 → bullet goes DOWN in 2D (+Y, which is +Z in 3D)
- angle = π → vx=-1, vy=0 → bullet goes LEFT in 2D (-X)
- angle = -π/2 → vx=0, vy=-1 → bullet goes UP in 2D (-Y, which is -Z in 3D)

## Required Mapping

| Mouse Position (3D) | dx  | dz  | atan2(dz,dx) | Required angle for server | Tank rotation.y |
|---------------------|-----|-----|--------------|--------------------------|----------------|
| Right (+X)          | +   | 0   | 0            | 0 (bullet +X)            | 0 or -π        |
| Down (+Z)           | 0   | +   | π/2          | π/2 (bullet +Y/+Z)       | -π/2           |
| Left (-X)           | -   | 0   | π            | π (bullet -X)            | 0 or π         |
| Up (-Z)             | 0   | -   | -π/2         | -π/2 (bullet -Y/-Z)      | π/2            |

## Current Implementation (PR #30)
```javascript
const newAngle = Math.atan2(dz, dx) - Math.PI / 2;
```

| Mouse Position | atan2(dz,dx) | newAngle | Server bullet | Expected | Match? |
|----------------|--------------|----------|---------------|----------|--------|
| Right (+X)     | 0            | -π/2     | (0,-1)=up     | (1,0)=right | ❌ |
| Down (+Z)      | π/2          | 0        | (1,0)=right   | (0,1)=down  | ❌ |
| Left (-X)      | π            | π/2      | (0,1)=down    | (-1,0)=left | ❌ |
| Up (-Z)        | -π/2         | -π        | (-1,0)=left   | (0,-1)=up   | ❌ |

**PR #30 fix is wrong! It rotates everything by 90 degrees!**

## Correct Implementation
The angle from `atan2(dz, dx)` already gives us the correct direction for the server:
- `atan2(dz, dx)` gives angle in XZ plane where +X is 0 and +Z is π/2
- Server expects angle where +X is 0 and +Y is π/2
- Since Y in 2D maps to Z in 3D, **no adjustment is needed!**

```javascript
const newAngle = Math.atan2(dz, dx);  // NO adjustment needed!
```

But we need to adjust the tank rendering:
```javascript
mesh.rotation.y = -(newAngle + Math.PI / 2);  // Adjust for tank orientation
```

Or simpler: adjust the angle to account for the tank barrel pointing in -Z when rotation.y = 0:
```javascript
const newAngle = Math.atan2(dz, dx);  // Correct for server
mesh.rotation.y = -(newAngle + Math.PI / 2);  // Adjust for barrel pointing at -Z
```

Wait, let me reconsider...

Actually, if barrel points in -Z when rotation.y = 0, and we want it to point towards +X (angle=0 for server):
- We need: rotation.y = -π/2 (rotates from -Z to +X)
- So: rotation.y = -(angle + π/2)

Let's verify:
- angle = 0 (right): rotation.y = -(0 + π/2) = -π/2 ✓ (points right)
- angle = π/2 (down): rotation.y = -(π/2 + π/2) = -π ✓ (points down)
- angle = π (left): rotation.y = -(π + π/2) = -3π/2 = π/2 ✓ (points left)
- angle = -π/2 (up): rotation.y = -(-π/2 + π/2) = 0 ✓ (points up)
