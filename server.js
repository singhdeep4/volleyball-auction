const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

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
try {
    if (fs.existsSync(STATE_FILE)) {
        appState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
} catch (e) {
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
                    fs.writeFileSync(STATE_FILE, JSON.stringify(appState, null, 2));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));

                    // Notify all listening clients (Team phones)
                    sseClients.forEach(c => {
                        try { c.write(`data: update\n\n`); } catch(e) {}
                    });
                } catch (e) {
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
                        res.writeHead(500);
                        res.end('Server Error');
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

server.listen(PORT, () => {
    console.log(`\n  🏐 VolleySphere Pro is running!\n`);
    console.log(`  ➜  Local: http://localhost:${PORT}\n`);
    console.log(`  Admin Password: admin@123\n`);
});
