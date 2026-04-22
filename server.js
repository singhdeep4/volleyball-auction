const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);

// --- CONFIG ---
const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, 'state.json');
const MONGO_URI = process.env.MONGO_URI;

// Global Error Handlers
process.on('uncaughtException', (err) => console.error('🔥 CRITICAL:', err));
process.on('unhandledRejection', (err) => console.error('🔥 CRITICAL:', err));

// Middleware
app.use(express.json({ limit: '50mb' })); // Allow large image uploads
app.use(express.static(__dirname)); // Perfectly serves styles.css, app.js, images, etc.

let appState = null;
let sseClients = [];
let dbCollection = null;

// Load State
async function initDB() {
    if (MONGO_URI) {
        try {
            const client = new MongoClient(MONGO_URI);
            await client.connect();
            const db = client.db('vpl_db');
            dbCollection = db.collection('app_state');
            
            const doc = await dbCollection.findOne({ _id: 'main_state' });
            if (doc && doc.state) {
                appState = doc.state;
                console.log('✅ State loaded from MongoDB.');
            } else {
                console.log('⚠️ No state in MongoDB, starting fresh.');
            }
        } catch (err) {
            console.error('❌ MongoDB Connection Error:', err);
        }
    } else {
        try {
            if (fs.existsSync(STATE_FILE)) {
                appState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
                console.log('✅ State loaded from local disk (state.json).');
            }
        } catch (e) {
            console.warn('⚠️ Local state load failed, starting fresh.');
        }
    }
}
initDB();

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
app.post('/api/state', async (req, res) => {
    try {
        appState = req.body.state;
        
        // Save to DB or Disk
        if (dbCollection) {
            try {
                await dbCollection.updateOne(
                    { _id: 'main_state' },
                    { $set: { state: appState } },
                    { upsert: true }
                );
            } catch (err) {
                console.error('❌ MongoDB save error:', err.message);
            }
        } else {
            // Async save to avoid blocking the event loop
            fs.writeFile(STATE_FILE, JSON.stringify(appState, null, 2), (err) => {
                if (err) console.error('❌ Disk save error:', err.message);
            });
        }

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
    console.log(`\n  🏐 VPL (Express) is LIVE!`);
    console.log(`  ➜  Port: ${PORT}\n`);
});
