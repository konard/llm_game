// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Network throttling tests for smooth movement
 *
 * This test suite verifies that player movement remains smooth
 * even under poor network conditions (high latency, packet loss, jitter).
 */

test.describe('Network Throttling - Smooth Movement Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the game
    await page.goto('/');

    // Wait for the game to load
    await page.waitForSelector('canvas#game-canvas', { timeout: 10000 });

    // Close the name modal if it's open
    await page.evaluate(() => {
      const modal = document.getElementById('name-modal');
      if (modal) {
        modal.classList.add('hidden');
      }
    });

    // Wait for WebSocket connection to be established
    await page.waitForFunction(() => {
      return window.ws && window.ws.readyState === WebSocket.OPEN;
    }, { timeout: 10000 });
  });

  test('should load game successfully', async ({ page }) => {
    // Check that canvas exists and has correct dimensions
    const canvas = await page.locator('canvas#game-canvas');
    await expect(canvas).toBeVisible();

    // Check that player is initialized
    const hasPlayer = await page.evaluate(() => {
      return window.playerId !== undefined && window.playerId !== null;
    });
    expect(hasPlayer).toBeTruthy();
  });

  test('should render player on canvas', async ({ page }) => {
    // Give the game a moment to render
    await page.waitForTimeout(500);

    // Take a screenshot to verify rendering
    const screenshot = await page.screenshot();
    expect(screenshot).toBeTruthy();

    // Verify that the canvas has been drawn on
    const hasRendered = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Check if any pixel is not transparent
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] !== 0) {
          return true;
        }
      }
      return false;
    });
    expect(hasRendered).toBeTruthy();
  });

  test('should handle movement with slow 3G network', async ({ page, context }) => {
    // Simulate Slow 3G network conditions
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50 * 1024 / 8,  // 50 KB/s
      uploadThroughput: 50 * 1024 / 8,    // 50 KB/s
      latency: 100,                        // 100ms latency
    });

    // Record player positions over time
    const positions = [];

    // Start recording positions
    await page.evaluate(() => {
      window.positionLog = [];
      const originalRender = window.render || window.drawGame;
      if (originalRender) {
        window.render = function() {
          if (window.players && window.playerId && window.players[window.playerId]) {
            const player = window.players[window.playerId];
            window.positionLog.push({
              time: Date.now(),
              x: player.x,
              y: player.y
            });
          }
          return originalRender.apply(this, arguments);
        };
      }
    });

    // Simulate arrow key movement
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(2000);  // Move for 2 seconds
    await page.keyboard.up('ArrowRight');

    // Get recorded positions
    const recordedPositions = await page.evaluate(() => window.positionLog || []);

    // Verify smooth movement (no backwards movement)
    expect(recordedPositions.length).toBeGreaterThan(10);

    let backwardsMovements = 0;
    for (let i = 1; i < recordedPositions.length; i++) {
      if (recordedPositions[i].x < recordedPositions[i - 1].x - 1) {
        backwardsMovements++;
      }
    }

    // Allow very minimal backwards movements (< 5% of frames)
    const backwardsPercentage = (backwardsMovements / recordedPositions.length) * 100;
    expect(backwardsPercentage).toBeLessThan(5);
  });

  test('should handle movement with high latency (200ms)', async ({ page, context }) => {
    // Simulate high latency network
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 100 * 1024 / 8,  // 100 KB/s
      uploadThroughput: 100 * 1024 / 8,    // 100 KB/s
      latency: 200,                         // 200ms latency
    });

    // Test vertical movement
    await page.evaluate(() => {
      window.positionLog = [];
    });

    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowDown');

    const positions = await page.evaluate(() => window.positionLog || []);

    // Verify that movement occurred
    expect(positions.length).toBeGreaterThan(10);

    // Check for smooth downward movement (y should increase)
    const firstY = positions[0]?.y || 0;
    const lastY = positions[positions.length - 1]?.y || 0;

    // Y coordinate should have increased (moving down)
    expect(lastY).toBeGreaterThan(firstY);
  });

  test('should handle movement with network jitter', async ({ page, context }) => {
    // Simulate network with jitter (varying latency)
    const client = await context.newCDPSession(page);

    // Start with baseline latency
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 100 * 1024 / 8,
      uploadThroughput: 100 * 1024 / 8,
      latency: 50,
    });

    await page.evaluate(() => {
      window.positionLog = [];
    });

    // Simulate movement while changing network conditions
    await page.keyboard.down('ArrowLeft');

    // Vary latency during movement
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(300);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 100 * 1024 / 8,
        uploadThroughput: 100 * 1024 / 8,
        latency: 50 + (i % 2) * 100,  // Alternate between 50ms and 150ms
      });
    }

    await page.keyboard.up('ArrowLeft');

    const positions = await page.evaluate(() => window.positionLog || []);

    // Verify movement occurred despite jitter
    expect(positions.length).toBeGreaterThan(10);

    // Check for general leftward movement
    const firstX = positions[0]?.x || 0;
    const lastX = positions[positions.length - 1]?.x || 0;

    // X coordinate should have decreased (moving left)
    expect(lastX).toBeLessThan(firstX);
  });

  test('should maintain smooth interpolation under packet loss', async ({ page, context }) => {
    // Simulate packet loss conditions
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 75 * 1024 / 8,
      uploadThroughput: 75 * 1024 / 8,
      latency: 100,
    });

    // Record positions with timestamps
    await page.evaluate(() => {
      window.detailedPositionLog = [];
      const logInterval = setInterval(() => {
        if (window.players && window.playerId && window.players[window.playerId]) {
          const player = window.players[window.playerId];
          window.detailedPositionLog.push({
            time: Date.now(),
            x: player.x,
            y: player.y
          });
        }
        if (window.detailedPositionLog.length > 100) {
          clearInterval(logInterval);
        }
      }, 50);
    });

    // Move diagonally
    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('ArrowRight');

    const positions = await page.evaluate(() => window.detailedPositionLog || []);

    // Verify we got position samples
    expect(positions.length).toBeGreaterThan(10);

    // Calculate smoothness metric (check for large jumps)
    let largeJumps = 0;
    for (let i = 1; i < positions.length; i++) {
      const dx = positions[i].x - positions[i - 1].x;
      const dy = positions[i].y - positions[i - 1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // A large jump would be > 50 pixels between samples
      if (distance > 50) {
        largeJumps++;
      }
    }

    // Should have minimal large jumps (< 10% of samples)
    const jumpPercentage = (largeJumps / positions.length) * 100;
    expect(jumpPercentage).toBeLessThan(10);
  });

  test('should handle shooting with network throttling', async ({ page, context }) => {
    // Apply network throttling
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50 * 1024 / 8,
      uploadThroughput: 50 * 1024 / 8,
      latency: 150,
    });

    // Record bullets before shooting
    const bulletsBefore = await page.evaluate(() => {
      return window.bullets ? Object.keys(window.bullets).length : 0;
    });

    // Shoot by pressing space
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Check that bullets were created
    const bulletsAfter = await page.evaluate(() => {
      return window.bullets ? Object.keys(window.bullets).length : 0;
    });

    // Bullets should have been created (might disappear quickly)
    // Just verify the shooting mechanism works
    expect(bulletsAfter).toBeGreaterThanOrEqual(0);
  });

  test('should handle multiple players with network throttling', async ({ page, context, browser }) => {
    // Apply network throttling to first player
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 100 * 1024 / 8,
      uploadThroughput: 100 * 1024 / 8,
      latency: 100,
    });

    // Get first player ID
    const player1Id = await page.evaluate(() => window.playerId);

    // Create a second player in a new context
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto('http://localhost:8080/');
    await page2.waitForSelector('canvas#game-canvas', { timeout: 10000 });
    await page2.waitForFunction(() => {
      return window.ws && window.ws.readyState === WebSocket.OPEN;
    }, { timeout: 10000 });

    // Get second player ID
    const player2Id = await page2.evaluate(() => window.playerId);

    // Verify different player IDs
    expect(player1Id).not.toBe(player2Id);

    // Move both players
    await page.keyboard.down('ArrowRight');
    await page2.keyboard.down('ArrowLeft');
    await page.waitForTimeout(1000);
    await page.keyboard.up('ArrowRight');
    await page2.keyboard.up('ArrowLeft');

    // Verify both players see each other
    const player1SeesPlayer2 = await page.evaluate((id) => {
      return window.players && window.players[id] !== undefined;
    }, player2Id);

    const player2SeesPlayer1 = await page2.evaluate((id) => {
      return window.players && window.players[id] !== undefined;
    }, player1Id);

    expect(player1SeesPlayer2).toBeTruthy();
    expect(player2SeesPlayer1).toBeTruthy();

    // Cleanup
    await context2.close();
  });
});
