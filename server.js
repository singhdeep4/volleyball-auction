const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);

// --- RENDER CONFIG ---
const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, 'state.json');

// Global Error Handlers
process.on('uncaughtException', (err) => console.error('🔥 CRITICAL:', err));
process.on('unhandledRejection', (err) => console.error('🔥 CRITICAL:', err));

// Middleware
app.use(express.json({ limit: '50mb' })); // Allow large image uploads
app.use(express.static(__dirname)); // Perfectly serves styles.css, app.js, images, etc.

let appState = null;
let sseClients = [];

// Load State
try {
    if (fs.existsSync(STATE_FILE)) {
        appState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        console.log('✅ State loaded.');
    }
} catch (e) {
    console.warn('⚠️ State load failed, starting fresh.');
}

// API: Real-time Stream (SSE)
app.get('/api/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no'
    });
    
    res.write(': heartbeat\n\n');
    sseClients.push(res);
    
    const hb = setInterval(() => {
        if (!res.writableEnded) res.write(': heartbeat\n\n');
    }, 20000);

    req.on('close', () => {
        clearInterval(hb);
        sseClients = sseClients.filter(c => c !== res);
    });
});

// API: GET State
app.get('/api/state', (req, res) => {
    res.json({ state: appState });
});

// API: POST State
app.post('/api/state', (req, res) => {
    try {
        appState = req.body.state;
        
        // Async save to avoid blocking the event loop
        fs.writeFile(STATE_FILE, JSON.stringify(appState, null, 2), (err) => {
            if (err) console.error('❌ Disk save error:', err.message);
        });

        res.json({ success: true });

        // Notify clients
        console.log(`📣 Notifying ${sseClients.length} clients...`);
        sseClients.forEach(c => {
            try { c.write(`data: update\n\n`); } catch(e) {}
        });
    } catch (e) {
        res.status(500).send('Error processing state');
    }
});

// SPA Fallback: Serve index.html for any unknown route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server on 0.0.0.0
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🏐 VolleySphere Pro (Express) is LIVE!`);
    console.log(`  ➜  Port: ${PORT}\n`);
});
