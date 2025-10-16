/**
 * Configuration for LLM Game WebSocket connection
 *
 * By default, this connects to the same host as the web page.
 * For GitHub Pages deployment or other hosting, modify the wsUrl below.
 */

window.GAME_CONFIG = {
    // WebSocket URL for the game server
    // Default: connect to the same host as the web page
    wsUrl: (function() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws`;
    })(),

    // Examples for different deployment scenarios:

    // For local development:
    // wsUrl: 'ws://localhost:8080/ws',

    // For GitHub Pages with external backend:
    // wsUrl: 'wss://your-backend-server.onrender.com/ws',
    // wsUrl: 'wss://your-app.railway.app/ws',
    // wsUrl: 'wss://your-app.fly.dev/ws',

    // For production deployment with custom domain:
    // wsUrl: 'wss://game.yourdomain.com/ws',
};
