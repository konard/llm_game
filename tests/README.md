# Playwright Tests

This directory contains automated end-to-end tests using [Playwright](https://playwright.dev/).

## Test Suites

### Network Throttling Tests (`network.spec.js`)

Tests game performance and smoothness under various network conditions:

- **Slow 3G Network**: Verifies smooth movement with 50 KB/s bandwidth and 100ms latency
- **High Latency**: Tests movement with 200ms latency
- **Network Jitter**: Validates smooth movement with varying latency (50-150ms)
- **Packet Loss**: Ensures interpolation works smoothly despite dropped packets
- **Throttled Shooting**: Verifies shooting mechanics work under network constraints
- **Multi-player**: Tests multiple concurrent players with network throttling

Key metrics tracked:
- Position continuity (no backwards movement)
- Smoothness (minimal large jumps between frames)
- Response time under degraded conditions

### Game Functionality Tests (`game.spec.js`)

Tests core game mechanics:

- Player initialization and WebSocket connection
- Arrow key movement (up, down, left, right, diagonal)
- Mouse aiming (angle updates)
- Shooting (space bar and mouse click)
- Canvas rendering
- State synchronization
- Boundary detection
- Page visibility handling

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install --with-deps chromium
```

### Running All Tests

```bash
npm test
```

### Running Specific Test Suite

```bash
# Run only network tests
npm run test:network

# Run only game functionality tests
npx playwright test tests/game.spec.js
```

### Running Tests with UI

```bash
npm run test:ui
```

### Running Tests in Headed Mode (see browser)

```bash
npm run test:headed
```

### Debug Mode

```bash
npm run test:debug
```

## Test Configuration

Configuration is in `playwright.config.js`:

- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: http://localhost:8080
- **Automatic server start**: The game server starts automatically before tests
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: Captured on failure
- **Video**: Recorded on failure
- **Trace**: Captured on first retry

## Network Throttling

Tests use Chrome DevTools Protocol (CDP) to simulate various network conditions:

- **Slow 3G**: 50 KB/s, 100ms latency
- **High Latency**: 100 KB/s, 200ms latency
- **Jitter**: Varying latency 50-150ms
- **Packet Loss**: Simulated through throttling

## CI Integration

Tests are designed to run in CI environments:

- Server starts automatically via `webServer` config
- Single worker on CI to avoid port conflicts
- Retry logic for flaky tests
- Detailed failure artifacts (screenshots, videos, traces)

## Writing New Tests

Example test structure:

```javascript
test('should test something', async ({ page }) => {
  // Navigate and wait for game
  await page.goto('/');
  await page.waitForSelector('canvas#gameCanvas');
  await page.waitForFunction(() => window.ws?.readyState === WebSocket.OPEN);

  // Test logic
  const result = await page.evaluate(() => {
    // Access game state
    return window.playerId;
  });

  expect(result).toBeTruthy();
});
```

## Troubleshooting

### Server won't start
- Check if port 8080 is already in use
- Verify Python and dependencies are installed
- Check server logs in test output

### Tests fail randomly
- Network throttling tests may be sensitive to system load
- Increase timeouts if needed
- Run with `--retries=3` for flaky tests

### Browser not found
- Run `npx playwright install --with-deps chromium`
- Check Playwright installation: `npx playwright --version`

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

Reports include:
- Test results and timing
- Screenshots of failures
- Video recordings
- Network traces
- Console logs
