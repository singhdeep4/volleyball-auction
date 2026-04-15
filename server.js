const http = require('http');
const fs = require('fs');
const path = require('path');

// --- RENDER HARDENING ---
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Essential for Render to bind correctly

// Global Error Handlers (Prevents silent 502 crashes)
process.on('uncaughtException', (err) => {
    console.error('🔥 CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
// ------------------------

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

let appState = null;
const STATE_FILE = path.join(__dirname, 'state.json');

// Improved Initial State Loading
try {
    if (fs.existsSync(STATE_FILE)) {
        const rawData = fs.readFileSync(STATE_FILE, 'utf8');
        if (rawData) {
            appState = JSON.parse(rawData);
            console.log('✅ State loaded successfully from file.');
        }
    }
} catch (e) {
    console.error('⚠️ Could not load state.json:', e.message);
    appState = null;
}

let sseClients = [];

const server = http.createServer((req, res) => {
    // API: Server-Sent Events for real-time updates
    if (req.url === '/api/stream') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no' // Essential for Render/Proxies
        });
        
        // Send initial heartbeat
        res.write(': heartbeat\n\n');
        
        sseClients.push(res);
        
        // Keep connection alive with a ping every 20s
        const heartbeat = setInterval(() => {
            if (!res.finished) {
                res.write(': heartbeat\n\n');
            }
        }, 20000);

        req.on('close', () => { 
            clearInterval(heartbeat);
            sseClients = sseClients.filter(c => c !== res); 
        });
        return;
    }

    // API: State Sync
    if (req.url === '/api/state') {
        // Enable CORS for state API
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ state: appState }));
            return;
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    appState = data.state;
                    
                    // Robust File Writing with try-catch
                    try {
                        fs.writeFileSync(STATE_FILE, JSON.stringify(appState, null, 2));
                    } catch (writeErr) {
                        console.error('❌ Disk Write Error:', writeErr.message);
                        // We still notify clients even if disk write fails (ephemeral update)
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));

                    // Notify all listening clients
                    console.log(`📣 Notifying ${sseClients.length} clients of update...`);
                    sseClients.forEach(c => {
                        try { c.write(`data: update\n\n`); } catch(e) {}
                    });
                } catch (e) {
                    console.error('❌ POST Parse Error:', e.message);
                    res.writeHead(500); res.end('Error parsing data');
                }
            });
            return;
        }
    }

    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Serve index.html for SPA routing
                fs.readFile(path.join(__dirname, 'index.html'), (e, d) => {
                    if (e) {
                        res.writeHead(404);
                        res.end('File Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(d);
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

// Explicitly bind to HOST (0.0.0.0) for Render
server.listen(PORT, HOST, () => {
    console.log(`\n  🏐 VolleySphere Pro is ready for the tournament!\n`);
    console.log(`  ➜  Mode: ${process.env.NODE_ENV || 'production'}`);
    console.log(`  ➜  Host: ${HOST}`);
    console.log(`  ➜  Port: ${PORT}`);
    console.log(`  ➜  URL:  http://localhost:${PORT}\n`);
    console.log(`  Admin Password: admin@123\n`);
});
