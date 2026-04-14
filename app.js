/* ============================================
   VolleySphere Pro — Application Logic
   ============================================ */

// ============ DEFAULT STATE ============
const TIER_BASE_PRICES = { A: 1000000, B: 500000, C: 300000, D: 200000 };
const TIER_LABELS = { A: 'Tier A', B: 'Tier B', C: 'Tier C', D: 'Tier D' };
const DEFAULT_TEAM_COLORS = ['#ff6b35', '#00d4ff', '#00e676', '#a855f7', '#ff5252', '#ffab00', '#ec4899', '#06b6d4'];
const DEFAULT_TEAM_NAMES = ['Thunder Wolves', 'Storm Eagles', 'Fire Dragons', 'Shadow Panthers', 'Golden Hawks', 'Ice Titans', 'Crimson Blaze', 'Aqua Sharks'];
const ADMIN_PASSWORD = 'admin@123';

function getDefaultState() {
    return {
        settings: {
            teamBudget: 10000000,
            teamCount: 4,
            sponsors: [
                { name: 'Sponsor 1', logo: null },
                { name: 'Sponsor 2', logo: null },
                { name: 'Sponsor 3', logo: null }
            ]
        },
        teams: [],
        players: [],
        currentAuction: null,
        auctionHistory: [],
        nextPlayerId: 1
    };
}

// ============ GLOBAL STATE ============
let state = {};
let currentUser = null; // { role: 'admin' } or { role: 'team', teamId: 0 }
let tempPhotoData = null;

// ============ INIT ============
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await loadState();
    initTeams();
    populateTeamSelect();

    setupSSE(); // Real-time server sync
    renderSponsors(); // Show sponsors even on login screen

    // Check for saved session
    const savedSession = sessionStorage.getItem('volleysphere_session');
    if (savedSession) {
        try {
            currentUser = JSON.parse(savedSession);
            if (currentUser.role === 'admin') {
                document.body.classList.remove('audience-mode');
                document.body.classList.add('admin-mode');
                document.getElementById('sponsorsSection').classList.remove('hidden');
                showScreen('adminDashboard');
                renderAdminDashboard();
            } else if (currentUser.role === 'team') {
                document.body.classList.remove('audience-mode');
                document.body.classList.remove('admin-mode');
                document.getElementById('sponsorsSection').classList.remove('hidden');
                showScreen('teamDashboard');
                renderTeamDashboard();
            } else if (currentUser.role === 'audience') {
                document.body.classList.add('audience-mode');
                document.body.classList.remove('admin-mode');
                document.getElementById('sponsorsSection').classList.remove('hidden');
                showScreen('adminDashboard');
                renderAdminDashboard();
            }
        } catch(e) { }
    } else {
        // No session - show crazy splash animation for login
        triggerSplashAnimation();
    }

    // Enter key handlers
    document.getElementById('adminPassword').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleAdminLogin();
    });
    document.getElementById('bidAmountInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') submitBid();
    });
    document.getElementById('playerName').addEventListener('keydown', e => {
        if (e.key === 'Enter') savePlayer();
    });
});

// ============ SERVER STATE PERSISTENCE ============
async function loadState() {
    try {
        const res = await fetch('/api/state');
        const data = await res.json();
        if (data.state) {
            state = data.state;
            if (!state.nextPlayerId) state.nextPlayerId = (state.players.length > 0 ? Math.max(...state.players.map(p => p.id)) + 1 : 1);
            if (!state.auctionHistory) state.auctionHistory = [];
            if (!state.currentAuction) state.currentAuction = null;
            if (!state.settings.sponsors) {
                state.settings.sponsors = [
                    { name: 'Sponsor 1', logo: null },
                    { name: 'Sponsor 2', logo: null },
                    { name: 'Sponsor 3', logo: null }
                ];
            }
            // Migration: Ensure all teams have a password
            if (state.teams) {
                state.teams.forEach(t => {
                    if (!t.password) t.password = 'team@123';
                });
            }
        } else {
            state = getDefaultState();
        }
    } catch (e) {
        console.error('Failed to load state from server:', e);
        state = getDefaultState();
    }
}

function saveState() {
    try {
        fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state })
        }).catch(err => console.error('Error saving state:', err));
    } catch (e) {
        console.error('Failed to save state:', e);
    }
}

function setupSSE() {
    console.log('🔗 Connecting to real-time update stream...');
    const evtSource = new EventSource('/api/stream');
    
    evtSource.onmessage = async (e) => {
        if (e.data === 'update') {
            console.log('⚡ Received real-time update!');
            const oldHistoryLength = state.auctionHistory ? state.auctionHistory.length : 0;

            if (currentUser && currentUser.role === 'team') {
                await loadState();
                renderTeamDashboard();
            } else if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'audience')) {
                const oldStateStr = JSON.stringify(state);
                await loadState();
                if (oldStateStr !== JSON.stringify(state)) {
                    renderAdminDashboard();
                }
            }

            const newHistoryLength = state.auctionHistory ? state.auctionHistory.length : 0;
            if (newHistoryLength > oldHistoryLength) {
                const latestEvent = state.auctionHistory[newHistoryLength - 1];
                if (latestEvent && latestEvent.result === 'sold') {
                    const team = getTeamById(latestEvent.teamId);
                    triggerSoldAnimation(
                        latestEvent.playerName, 
                        team ? team.name : 'Unknown', 
                        formatMoneyFull(latestEvent.price), 
                        team ? team.color : '#ff6b35'
                    );
                }
            }
        }
    };

    evtSource.onerror = (err) => {
        console.error('❌ SSE Connection failed. Reconnecting...', err);
        evtSource.close();
        // Try to reconnect after 3 seconds
        setTimeout(setupSSE, 3000);
    };
}

function initTeams() {
    if (!state.teams || state.teams.length === 0) {
        state.teams = [];
        for (let i = 0; i < state.settings.teamCount; i++) {
            state.teams.push({
                id: i,
                name: DEFAULT_TEAM_NAMES[i] || `Team ${i + 1}`,
                color: DEFAULT_TEAM_COLORS[i] || '#888888',
                password: 'team@123', // Default team password
                budget: state.settings.teamBudget,
                spent: 0,
                players: []
            });
        }
        saveState();
    }
}

// ============ FORMATTING HELPERS ============
function formatMoney(amount) {
    if (amount == null) return '₹0';
    const num = Number(amount);
    if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
    if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + ' L';
    if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + ' K';
    return '₹' + num.toLocaleString('en-IN');
}

function formatMoneyFull(amount) {
    if (amount == null) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN');
}

function getTimeStr() {
    const now = new Date();
    return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getPlayerById(id) {
    return state.players.find(p => p.id === id);
}

function getTeamById(id) {
    return state.teams.find(t => t.id === id);
}

// ============ TOAST NOTIFICATIONS ============
let toastTimer = null;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMsg');

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    icon.textContent = icons[type] || '✅';
    msg.textContent = message;

    toast.className = 'toast ' + type;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}

// ============ SCREEN MANAGEMENT ============
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ============ LOGIN ============
function switchLoginTab(tab) {
    // Remove active from all tabs
    document.getElementById('adminTabBtn').classList.remove('active');
    document.getElementById('teamTabBtn').classList.remove('active');
    document.getElementById('audienceTabBtn').classList.remove('active');
    
    // Remove active from all forms
    document.getElementById('adminLoginForm').classList.remove('active');
    document.getElementById('teamLoginForm').classList.remove('active');
    document.getElementById('audienceLoginForm').classList.remove('active');
    
    // Add active to selected
    document.getElementById(tab + 'TabBtn').classList.add('active');
    document.getElementById(tab + 'LoginForm').classList.add('active');
    
    document.getElementById('loginError').classList.add('hidden');
}

function populateTeamSelect() {
    const select = document.getElementById('teamSelect');
    select.innerHTML = '<option value="">-- Choose Your Team --</option>';
    state.teams.forEach(team => {
        select.innerHTML += `<option value="${team.id}">${team.name}</option>`;
    });
}

function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        currentUser = { role: 'admin' };
        sessionStorage.setItem('volleysphere_session', JSON.stringify(currentUser));
        document.getElementById('adminPassword').value = '';
        document.getElementById('loginError').classList.add('hidden');
        document.body.classList.add('admin-mode');
        document.getElementById('sponsorsSection').classList.remove('hidden');
        showScreen('adminDashboard');
        renderAdminDashboard();
    } else {
        const err = document.getElementById('loginError');
        err.textContent = 'Invalid admin password';
        err.classList.remove('hidden');
    }
}

function handleTeamLogin() {
    const teamId = document.getElementById('teamSelect').value;
    const password = document.getElementById('teamPassword').value;

    if (!teamId && teamId !== 0) {
        const err = document.getElementById('loginError');
        err.textContent = 'Please select a team';
        err.classList.remove('hidden');
        return;
    }

    const team = getTeamById(parseInt(teamId));
    if (!team) return;

    // Verify Password
    if (password === (team.password || 'team@123')) {
        currentUser = { role: 'team', teamId: parseInt(teamId) };
        sessionStorage.setItem('volleysphere_session', JSON.stringify(currentUser));
        document.getElementById('teamPassword').value = '';
        document.getElementById('loginError').classList.add('hidden');
        document.body.classList.remove('admin-mode');
        document.getElementById('sponsorsSection').classList.remove('hidden');
        showScreen('teamDashboard');
        renderTeamDashboard();
    } else {
        const err = document.getElementById('loginError');
        err.textContent = 'Invalid team password';
        err.classList.remove('hidden');
    }
}

function handleLogout() {
    currentUser = null;
    sessionStorage.removeItem('volleysphere_session');
    document.body.classList.remove('audience-mode');
    document.body.classList.remove('admin-mode');
    // Ensure sponsors remain visible on login page
    document.getElementById('sponsorsSection').classList.remove('hidden');
    showScreen('loginScreen');
    triggerSplashAnimation();
}

function handleAudienceLogin() {
    currentUser = { role: 'audience' };
    sessionStorage.setItem('volleysphere_session', JSON.stringify(currentUser));
    document.getElementById('loginError').classList.add('hidden');
    document.body.classList.add('audience-mode');
    document.body.classList.remove('admin-mode');
    document.getElementById('sponsorsSection').classList.remove('hidden');
    showScreen('adminDashboard');
    renderAdminDashboard();
}

// ============ ADMIN DASHBOARD RENDERING ============
function renderAdminDashboard() {
    renderAvailablePlayers();
    renderTeamBudgetSidebar();
    renderAuctionState();
    renderAuctionLog();
    renderPlayersGrid();
    renderTeamsGrid();
    renderResults();
    renderSponsors();
}

// ---------- Dashboard Tab Switching ----------
function switchDashTab(tab) {
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
    document.getElementById(tab + 'Tab').classList.add('active');

    // Re-render on switch
    if (tab === 'auction') { renderAvailablePlayers(); renderTeamBudgetSidebar(); renderAuctionState(); renderAuctionLog(); }
    if (tab === 'players') renderPlayersGrid();
    if (tab === 'teams') renderTeamsGrid();
    if (tab === 'results') renderResults();
}

// ---------- Available Players Sidebar ----------
function renderAvailablePlayers() {
    const container = document.getElementById('availablePlayersList');
    const available = state.players.filter(p => p.status === 'available');
    document.getElementById('availableCount').textContent = available.length;

    if (available.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>No available players</p>
                <p class="empty-hint">Add players in the Players tab</p>
            </div>`;
        return;
    }

    container.innerHTML = available.map(player => `
        <div class="player-list-item" onclick="selectPlayerForAuction(${player.id})">
            <div class="pli-photo">
                ${player.photo ? `<img src="${player.photo}" alt="${player.name}">` : '👤'}
            </div>
            <div class="pli-info">
                <div class="pli-name">${player.name}</div>
                <div class="pli-meta">
                    <span class="tier-badge tier-${player.tier}">${player.tier}</span>
                    <span>${formatMoney(player.basePrice)}</span>
                </div>
            </div>
            <button class="pli-action" onclick="event.stopPropagation(); startAuction(${player.id})">Auction</button>
        </div>
    `).join('');
}

// ---------- Team Budget Sidebar ----------
function renderTeamBudgetSidebar() {
    const container = document.getElementById('teamBudgetCards');
    container.innerHTML = state.teams.map(team => {
        const remaining = team.budget - team.spent;
        const pct = (remaining / team.budget) * 100;
        return `
        <div class="team-budget-card">
            <div class="tbudget-header">
                <div class="tbudget-dot" style="background:${team.color}"></div>
                <div class="tbudget-name">${team.name}</div>
                <div class="tbudget-count">${team.players.length} players</div>
            </div>
            <div class="tbudget-amount">${formatMoney(remaining)}</div>
            <div class="tbudget-bar">
                <div class="tbudget-bar-fill" style="width:${pct}%; background:${team.color}"></div>
            </div>
        </div>`;
    }).join('');
}

// ---------- Auction State ----------
function renderAuctionState() {
    const noAuction = document.getElementById('noAuctionState');
    const activeAuction = document.getElementById('activeAuctionState');

    if (!state.currentAuction) {
        noAuction.classList.remove('hidden');
        activeAuction.classList.add('hidden');
        return;
    }

    noAuction.classList.add('hidden');
    activeAuction.classList.remove('hidden');

    const player = getPlayerById(state.currentAuction.playerId);
    if (!player) return;

    // Player info
    document.getElementById('auctionPlayerPhoto').innerHTML = player.photo
        ? `<img src="${player.photo}" alt="${player.name}">`
        : `<div class="default-avatar">👤</div>`;
    document.getElementById('auctionPlayerName').textContent = player.name;
    document.getElementById('auctionPlayerTier').textContent = TIER_LABELS[player.tier];
    document.getElementById('auctionPlayerTier').className = 'tier-badge tier-' + player.tier;
    document.getElementById('auctionPlayerBase').textContent = 'Base: ' + formatMoneyFull(player.basePrice);

    // Highest bid
    const hb = state.currentAuction.highestBid;
    const hbDisplay = document.getElementById('highestBidDisplay');
    if (hb && hb.amount > 0) {
        const hbTeam = getTeamById(hb.teamId);
        document.getElementById('highestBidAmount').textContent = formatMoneyFull(hb.amount);
        document.getElementById('highestBidTeam').textContent = hbTeam ? `by ${hbTeam.name}` : 'Unknown Team';
        hbDisplay.classList.add('has-bid');
        document.getElementById('btnConfirmSale').disabled = false;
    } else {
        document.getElementById('highestBidAmount').textContent = formatMoneyFull(player.basePrice);
        document.getElementById('highestBidTeam').textContent = 'Base Price — No bids yet';
        hbDisplay.classList.remove('has-bid');
        document.getElementById('btnConfirmSale').disabled = true;
    }

    // Team bid grid
    renderTeamBidGrid();

    // Bid history
    renderBidHistory();
}

function renderTeamBidGrid() {
    const container = document.getElementById('teamBidGrid');
    const auction = state.currentAuction;

    container.innerHTML = state.teams.map(team => {
        const remaining = team.budget - team.spent;
        const isHighest = auction.highestBid && auction.highestBid.teamId === team.id;
        const teamBids = auction.bids.filter(b => b.teamId === team.id);
        const lastBid = teamBids.length > 0 ? teamBids[teamBids.length - 1] : null;

        return `
        <div class="team-bid-card ${isHighest ? 'highest-bidder' : ''}">
            <div class="tbc-color" style="background:${team.color}"></div>
            <div class="tbc-name">${team.name}</div>
            <div class="tbc-budget">Budget: ${formatMoney(remaining)}</div>
            ${lastBid ? `<div class="tbc-last-bid">Last bid: ${formatMoneyFull(lastBid.amount)}</div>` : ''}
            <button class="tbc-bid-btn" onclick="openBidModal(${team.id})">
                💰 Place Bid
            </button>
        </div>`;
    }).join('');
}

function renderBidHistory() {
    const container = document.getElementById('bidHistoryList');
    const auction = state.currentAuction;

    if (!auction || auction.bids.length === 0) {
        container.innerHTML = '<p class="empty-hint">No bids placed yet</p>';
        return;
    }

    container.innerHTML = [...auction.bids].reverse().map(bid => {
        const team = getTeamById(bid.teamId);
        return `
        <div class="bid-history-item">
            <span class="bhi-team" style="color:${team ? team.color : '#fff'}">${team ? team.name : 'Unknown'}</span>
            <span class="bhi-amount">${formatMoneyFull(bid.amount)}</span>
            <span class="bhi-time">${bid.time}</span>
        </div>`;
    }).join('');
}

// ---------- Auction Log ----------
function renderAuctionLog() {
    const container = document.getElementById('auctionLog');
    if (state.auctionHistory.length === 0) {
        container.innerHTML = '<p class="empty-hint">No completed auctions yet</p>';
        return;
    }

    container.innerHTML = [...state.auctionHistory].reverse().map(entry => {
        if (entry.result === 'sold') {
            const team = getTeamById(entry.teamId);
            return `
            <div class="log-item sold">
                <span class="log-player">${entry.playerName}</span>
                <span class="log-detail">Sold to ${team ? team.name : 'Unknown'} for ${formatMoneyFull(entry.price)}</span>
            </div>`;
        } else {
            return `
            <div class="log-item unsold">
                <span class="log-player">${entry.playerName}</span>
                <span class="log-detail">Unsold</span>
            </div>`;
        }
    }).join('');
}

// ============ AUCTION FLOW ============

function selectPlayerForAuction(playerId) {
    // Just highlight in the UI — clicking "Auction" button starts it
    document.querySelectorAll('.player-list-item').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
}

function startAuction(playerId) {
    const player = getPlayerById(playerId);
    if (!player) return showToast('Player not found', 'error');
    if (player.status !== 'available') return showToast('Player is not available', 'error');
    if (state.currentAuction) return showToast('An auction is already in progress. Cancel or complete it first.', 'warning');

    player.status = 'bidding';
    state.currentAuction = {
        playerId: player.id,
        bids: [],
        highestBid: null
    };
    saveState();
    renderAuctionState();
    renderAvailablePlayers();
    renderTeamBudgetSidebar();
    showToast(`Auction started for ${player.name}!`, 'info');
}

// ---------- Bid Modal ----------
function openBidModal(teamId) {
    const team = getTeamById(teamId);
    const auction = state.currentAuction;
    const player = getPlayerById(auction.playerId);
    if (!team || !auction || !player) return;

    const remaining = team.budget - team.spent;
    const currentHighest = auction.highestBid ? auction.highestBid.amount : 0;
    const minBid = currentHighest > 0 ? currentHighest + 1 : player.basePrice;

    document.getElementById('bidModalTitle').textContent = `Bid for ${team.name}`;
    document.getElementById('bidCurrentHighest').textContent = currentHighest > 0 ? formatMoneyFull(currentHighest) : formatMoneyFull(player.basePrice) + ' (base)';
    document.getElementById('bidTeamBudget').textContent = formatMoneyFull(remaining);
    document.getElementById('bidMinInfo').textContent = `Minimum bid: ${formatMoneyFull(minBid)}`;
    document.getElementById('bidAmountInput').value = minBid;
    document.getElementById('bidAmountInput').min = minBid;
    document.getElementById('bidTeamId').value = teamId;

    document.getElementById('bidModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('bidAmountInput').focus(), 100);
}

function closeBidModal() {
    document.getElementById('bidModal').classList.add('hidden');
}

function submitBid() {
    const teamId = parseInt(document.getElementById('bidTeamId').value);
    const amount = parseInt(document.getElementById('bidAmountInput').value);
    const team = getTeamById(teamId);
    const auction = state.currentAuction;
    const player = getPlayerById(auction.playerId);

    if (!team || !auction || !player) return showToast('Error: Invalid data', 'error');

    const remaining = team.budget - team.spent;
    if (amount > remaining) return showToast(`${team.name} doesn't have enough budget! Remaining: ${formatMoneyFull(remaining)}`, 'error');

    const currentHighest = auction.highestBid ? auction.highestBid.amount : 0;
    const minBid = currentHighest > 0 ? currentHighest + 1 : player.basePrice;
    if (amount < minBid) return showToast(`Bid must be at least ${formatMoneyFull(minBid)}`, 'error');

    // Record bid
    auction.bids.push({
        teamId: teamId,
        amount: amount,
        time: getTimeStr()
    });

    // Update highest
    if (!auction.highestBid || amount > auction.highestBid.amount) {
        auction.highestBid = { teamId, amount };
    }

    saveState();
    closeBidModal();
    renderAuctionState();
    showToast(`${team.name} bid ${formatMoneyFull(amount)}!`, 'success');
}

// ---------- Confirm Sale ----------
function confirmSaleToHighest() {
    const auction = state.currentAuction;
    if (!auction || !auction.highestBid) return showToast('No bids to confirm', 'error');

    const player = getPlayerById(auction.playerId);
    const team = getTeamById(auction.highestBid.teamId);
    if (!player || !team) return;

    // Show confirmation modal
    document.getElementById('saleConfirmDetails').innerHTML = `
        <div class="scd-player">${player.name}</div>
        <div class="scd-team">→ ${team.name}</div>
        <div class="scd-price">${formatMoneyFull(auction.highestBid.amount)}</div>
    `;
    document.getElementById('finalSalePrice').value = auction.highestBid.amount;
    document.getElementById('confirmSaleModal').classList.remove('hidden');
}

function closeConfirmSaleModal() {
    document.getElementById('confirmSaleModal').classList.add('hidden');
}

function executeSale() {
    const auction = state.currentAuction;
    if (!auction || !auction.highestBid) return;

    const finalPrice = parseInt(document.getElementById('finalSalePrice').value);
    if (!finalPrice || finalPrice <= 0) return showToast('Enter a valid price', 'error');

    const player = getPlayerById(auction.playerId);
    const team = getTeamById(auction.highestBid.teamId);
    if (!player || !team) return;

    const remaining = team.budget - team.spent;
    if (finalPrice > remaining) return showToast('Team does not have enough budget!', 'error');

    // Execute
    player.status = 'sold';
    player.soldTo = team.id;
    player.soldPrice = finalPrice;

    team.spent += finalPrice;
    team.players.push({
        id: player.id,
        name: player.name,
        photo: player.photo,
        tier: player.tier,
        price: finalPrice
    });

    // Log
    state.auctionHistory.push({
        playerId: player.id,
        playerName: player.name,
        teamId: team.id,
        price: finalPrice,
        result: 'sold',
        time: getTimeStr()
    });

    // Clear auction
    state.currentAuction = null;
    saveState();

    closeConfirmSaleModal();
    renderAdminDashboard();
    triggerSoldAnimation(player.name, team.name, formatMoneyFull(finalPrice), team.color);
    showToast(`${player.name} sold to ${team.name} for ${formatMoneyFull(finalPrice)}!`, 'success');
}

function markUnsold() {
    const auction = state.currentAuction;
    if (!auction) return;

    const player = getPlayerById(auction.playerId);
    if (!player) return;

    player.status = 'unsold';

    state.auctionHistory.push({
        playerId: player.id,
        playerName: player.name,
        result: 'unsold',
        time: getTimeStr()
    });

    state.currentAuction = null;
    saveState();
    renderAdminDashboard();
    showToast(`${player.name} marked as unsold`, 'warning');
}

function cancelAuction() {
    const auction = state.currentAuction;
    if (!auction) return;

    const player = getPlayerById(auction.playerId);
    if (player) player.status = 'available';

    state.currentAuction = null;
    saveState();
    renderAdminDashboard();
    showToast('Auction cancelled', 'info');
}

// ============ PLAYER MANAGEMENT ============
function renderPlayersGrid() {
    const container = document.getElementById('playersGrid');

    if (state.players.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <span class="empty-icon">👥</span>
                <p>No players added yet</p>
                <button class="btn btn-primary" style="margin-top:1rem" onclick="openAddPlayerModal()">Add Your First Player</button>
            </div>`;
        return;
    }

    container.innerHTML = state.players.map(player => {
        const statusClass = player.status === 'sold' ? 'status-sold' : player.status === 'bidding' ? 'status-bidding' : 'status-available';
        const team = player.soldTo != null ? getTeamById(player.soldTo) : null;

        return `
        <div class="player-card">
            <div class="player-card-status">
                <span class="status-dot ${statusClass}" title="${player.status}"></span>
            </div>
            <div class="pc-photo" onclick="triggerPhotoUpload(${player.id})">
                ${player.photo ? `<img src="${player.photo}" alt="${player.name}">` : '👤'}
                <div class="pc-photo-overlay">📷 Change Photo</div>
            </div>
            <div class="pc-body">
                <div class="pc-name">${player.name}</div>
                <div class="pc-tier-price">
                    <span class="tier-badge tier-${player.tier}">${player.tier}</span>
                    <span class="pc-price">${formatMoney(player.basePrice)}</span>
                </div>
                ${player.status === 'sold' && team ? `<div class="pc-sold-info">Sold to ${team.name} for ${formatMoney(player.soldPrice)}</div>` : ''}
                <div class="pc-actions">
                    <button class="btn btn-outline btn-sm" onclick="openEditPlayerModal(${player.id})">✏️ Edit</button>
                    ${player.status === 'sold' ?
                        `<button class="btn btn-warning btn-sm" onclick="revertSale(${player.id})">↩️ Revert</button>` :
                        `<button class="btn btn-danger btn-sm" onclick="deletePlayer(${player.id})">🗑️</button>`
                    }
                </div>
            </div>
        </div>`;
    }).join('');
}

// ---------- Photo Upload for Player Cards ----------
function triggerPhotoUpload(playerId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const player = getPlayerById(playerId);
            if (player) {
                player.photo = ev.target.result;
                saveState();
                renderPlayersGrid();
                renderAvailablePlayers();
                if (state.currentAuction && state.currentAuction.playerId === playerId) {
                    renderAuctionState();
                }
                showToast('Photo updated!', 'success');
            }
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// ---------- Add Player Modal ----------
function openAddPlayerModal() {
    document.getElementById('playerModalTitle').textContent = 'Add New Player';
    document.getElementById('playerName').value = '';
    document.getElementById('playerTier').value = 'A';
    document.getElementById('playerBasePrice').value = '';
    document.getElementById('editPlayerId').value = '';
    tempPhotoData = null;
    document.getElementById('photoPreview').innerHTML = `
        <span class="upload-icon">📷</span>
        <p>Click to upload photo</p>`;
    document.getElementById('playerModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('playerName').focus(), 100);
}

function openEditPlayerModal(playerId) {
    const player = getPlayerById(playerId);
    if (!player) return;

    document.getElementById('playerModalTitle').textContent = 'Edit Player';
    document.getElementById('playerName').value = player.name;
    document.getElementById('playerTier').value = player.tier;
    document.getElementById('playerBasePrice').value = player.basePrice;
    document.getElementById('editPlayerId').value = player.id;
    tempPhotoData = player.photo || null;

    if (player.photo) {
        document.getElementById('photoPreview').innerHTML = `<img src="${player.photo}" alt="${player.name}">`;
    } else {
        document.getElementById('photoPreview').innerHTML = `
            <span class="upload-icon">📷</span>
            <p>Click to upload photo</p>`;
    }
    document.getElementById('playerModal').classList.remove('hidden');
}

function closePlayerModal() {
    document.getElementById('playerModal').classList.add('hidden');
    tempPhotoData = null;
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        tempPhotoData = e.target.result;
        document.getElementById('photoPreview').innerHTML = `<img src="${tempPhotoData}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

function savePlayer() {
    const name = document.getElementById('playerName').value.trim();
    const tier = document.getElementById('playerTier').value;
    const basePriceInput = document.getElementById('playerBasePrice').value;
    const editId = document.getElementById('editPlayerId').value;

    if (!name) return showToast('Please enter player name', 'error');

    const basePrice = basePriceInput ? parseInt(basePriceInput) : TIER_BASE_PRICES[tier];

    if (editId) {
        // Edit existing
        const player = getPlayerById(parseInt(editId));
        if (player) {
            player.name = name;
            player.tier = tier;
            player.basePrice = basePrice;
            if (tempPhotoData) player.photo = tempPhotoData;
        }
    } else {
        // Add new
        state.players.push({
            id: state.nextPlayerId++,
            name: name,
            photo: tempPhotoData || null,
            tier: tier,
            basePrice: basePrice,
            status: 'available',
            soldTo: null,
            soldPrice: null
        });
    }

    saveState();
    closePlayerModal();
    renderPlayersGrid();
    renderAvailablePlayers();
    showToast(editId ? 'Player updated!' : 'Player added!', 'success');
}

function deletePlayer(playerId) {
    if (!confirm('Delete this player?')) return;
    state.players = state.players.filter(p => p.id !== playerId);
    saveState();
    renderPlayersGrid();
    renderAvailablePlayers();
    showToast('Player deleted', 'info');
}

function revertSale(playerId) {
    if (!confirm('Revert this sale? The player will become available again and the team budget will be restored.')) return;

    const player = getPlayerById(playerId);
    if (!player || player.status !== 'sold') return;

    const team = getTeamById(player.soldTo);
    if (team) {
        team.spent -= player.soldPrice;
        team.players = team.players.filter(p => p.id !== playerId);
    }

    player.status = 'available';
    player.soldTo = null;
    player.soldPrice = null;

    // Remove from history
    state.auctionHistory = state.auctionHistory.filter(h => h.playerId !== playerId || h.result !== 'sold');

    saveState();
    renderAdminDashboard();
    showToast('Sale reverted!', 'success');
}

// ---------- Bulk Add ----------
function openBulkAddModal() {
    document.getElementById('bulkPlayersText').value = '';
    document.getElementById('bulkAddModal').classList.remove('hidden');
}

function closeBulkAddModal() {
    document.getElementById('bulkAddModal').classList.add('hidden');
}

function saveBulkPlayers() {
    const text = document.getElementById('bulkPlayersText').value.trim();
    if (!text) return showToast('Please enter player data', 'error');

    const lines = text.split('\n').filter(l => l.trim());
    let added = 0;

    lines.forEach(line => {
        const parts = line.split(',').map(s => s.trim());
        const name = parts[0];
        let tier = (parts[1] || 'B').toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(tier)) tier = 'B';

        if (name) {
            state.players.push({
                id: state.nextPlayerId++,
                name: name,
                photo: null,
                tier: tier,
                basePrice: TIER_BASE_PRICES[tier],
                status: 'available',
                soldTo: null,
                soldPrice: null
            });
            added++;
        }
    });

    saveState();
    closeBulkAddModal();
    renderPlayersGrid();
    renderAvailablePlayers();
    showToast(`Added ${added} players!`, 'success');
}

// ============ TEAMS TAB ============
function renderTeamsGrid() {
    const container = document.getElementById('teamsGrid');

    container.innerHTML = state.teams.map(team => {
        const remaining = team.budget - team.spent;
        return `
        <div class="team-card">
            <div class="tc-header">
                <div class="tc-color-strip" style="background:${team.color}"></div>
                <div class="tc-name">${team.name}</div>
                <div class="tc-budget-info">
                    <div class="tc-stat">
                        <span class="tc-stat-label">Budget</span>
                        <span class="tc-stat-value">${formatMoney(team.budget)}</span>
                    </div>
                    <div class="tc-stat">
                        <span class="tc-stat-label">Spent</span>
                        <span class="tc-stat-value" style="color:var(--warning)">${formatMoney(team.spent)}</span>
                    </div>
                    <div class="tc-stat">
                        <span class="tc-stat-label">Remaining</span>
                        <span class="tc-stat-value" style="color:var(--success)">${formatMoney(remaining)}</span>
                    </div>
                </div>
            </div>
            <div class="tc-roster">
                <h4>Roster (${team.players.length} players)</h4>
                ${team.players.length === 0 ? '<p class="empty-hint">No players purchased</p>' :
                    team.players.map(p => `
                        <div class="tc-player-item">
                            <div class="tc-player-photo">
                                ${p.photo ? `<img src="${p.photo}" alt="${p.name}">` : '👤'}
                            </div>
                            <span class="tc-player-name">${p.name}</span>
                            <span class="tier-badge tier-${p.tier}" style="font-size:0.6rem">${p.tier}</span>
                            <span class="tc-player-price">${formatMoney(p.price)}</span>
                        </div>`).join('')
                }
            </div>
        </div>`;
    }).join('');
}

// ============ RESULTS TAB ============
function renderResults() {
    const container = document.getElementById('resultsContent');

    if (state.auctionHistory.filter(h => h.result === 'sold').length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:3rem">
                <span class="empty-icon">📊</span>
                <p>No completed sales yet</p>
                <p class="empty-hint">Results will appear here after players are sold</p>
            </div>`;
        return;
    }

    let totalAllSpent = 0;
    container.innerHTML = state.teams.map(team => {
        const remaining = team.budget - team.spent;
        totalAllSpent += team.spent;

        return `
        <div class="results-team-block">
            <div class="rtb-header">
                <div class="rtb-color-strip" style="background:${team.color}"></div>
                <div class="rtb-name">${team.name}</div>
                <div class="rtb-budget">
                    <span class="rtb-budget-label">Remaining Budget</span>
                    <span class="rtb-budget-value">${formatMoneyFull(remaining)}</span>
                </div>
            </div>
            ${team.players.length > 0 ? `
                <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;">
                    <table class="rtb-table" style="white-space: nowrap; min-width: 600px;">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Player</th>
                                <th>Tier</th>
                                <th>Base Price</th>
                                <th>Sold Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${team.players.map((p, i) => {
                                const fullPlayer = getPlayerById(p.id);
                                return `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td style="display:flex;align-items:center;gap:0.5rem">
                                        <div style="width:28px;height:28px;border-radius:50%;overflow:hidden;background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:0.8rem;flex-shrink:0;">
                                            ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover">` : '👤'}
                                        </div>
                                        ${p.name}
                                    </td>
                                    <td><span class="tier-badge tier-${p.tier}">${p.tier}</span></td>
                                    <td>${formatMoneyFull(fullPlayer ? fullPlayer.basePrice : TIER_BASE_PRICES[p.tier])}</td>
                                    <td style="color:var(--success);font-weight:600">${formatMoneyFull(p.price)}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="rtb-total">
                    <span>Total Spent: <span class="rtb-total-spent">${formatMoneyFull(team.spent)}</span></span>
                    <span>Remaining: <span class="rtb-total-remaining">${formatMoneyFull(remaining)}</span></span>
                </div>
            ` : `<div class="empty-hint" style="padding:1.5rem">No players purchased</div>`}
        </div>`;
    }).join('');

    // Grand total
    container.innerHTML += `
    <div class="results-team-block" style="border-color:var(--primary)">
        <div class="rtb-header" style="background:rgba(255,107,53,0.05)">
            <div class="rtb-color-strip" style="background:var(--primary)"></div>
            <div class="rtb-name" style="font-size:1.3rem">📊 Grand Total</div>
            <div class="rtb-budget">
                <span class="rtb-budget-label">Total Auction Value</span>
                <span class="rtb-budget-value" style="font-size:1.3rem">${formatMoneyFull(totalAllSpent)}</span>
            </div>
        </div>
        <div style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;">
            <table class="rtb-table" style="white-space: nowrap; min-width: 500px;">
                <thead>
                    <tr>
                        <th>Team</th>
                        <th>Players</th>
                        <th>Total Spent</th>
                        <th>Remaining</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.teams.map(t => `
                        <tr>
                            <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${t.color};margin-right:0.5rem"></span>${t.name}</td>
                            <td>${t.players.length}</td>
                            <td style="color:var(--warning);font-weight:600">${formatMoneyFull(t.spent)}</td>
                            <td style="color:var(--success);font-weight:600">${formatMoneyFull(t.budget - t.spent)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

function printResults() {
    switchDashTab('results');
    setTimeout(() => window.print(), 300);
}

// ============ TEAM VIEWER DASHBOARD ============
function renderTeamDashboard() {
    if (!currentUser || currentUser.role !== 'team') return;

    const team = getTeamById(currentUser.teamId);
    if (!team) return;

    const remaining = team.budget - team.spent;

    document.getElementById('teamViewerTitle').textContent = '🏐 ' + team.name;
    document.getElementById('tvTotalBudget').textContent = formatMoneyFull(team.budget);
    document.getElementById('tvRemaining').textContent = formatMoneyFull(remaining);
    document.getElementById('tvSpent').textContent = formatMoneyFull(team.spent);
    document.getElementById('tvPlayerCount').textContent = team.players.length;

    // Roster
    const rosterEl = document.getElementById('tvRoster');
    if (team.players.length === 0) {
        rosterEl.innerHTML = '<p class="empty-hint">No players purchased yet</p>';
    } else {
        rosterEl.innerHTML = team.players.map(p => `
            <div class="tc-player-item">
                <div class="tc-player-photo">
                    ${p.photo ? `<img src="${p.photo}" alt="${p.name}">` : '👤'}
                </div>
                <span class="tc-player-name">${p.name}</span>
                <span class="tier-badge tier-${p.tier}" style="font-size:0.6rem">${p.tier}</span>
                <span class="tc-player-price">${formatMoney(p.price)}</span>
            </div>`).join('');
    }

    // Current auction
    const auctionEl = document.getElementById('tvAuctionStatus');
    if (state.currentAuction) {
        const player = getPlayerById(state.currentAuction.playerId);
        const hb = state.currentAuction.highestBid;
        if (player) {
            auctionEl.innerHTML = `
                <div class="tv-auction-active">
                    <div class="auction-live-badge" style="margin:0 auto 0.8rem;width:fit-content">
                        <span class="pulse-dot"></span> LIVE BIDDING
                    </div>
                    <div class="tv-player-photo">
                        ${player.photo ? `<img src="${player.photo}" alt="${player.name}">` : '👤'}
                    </div>
                    <h3>${player.name}</h3>
                    <span class="tier-badge tier-${player.tier}">${player.tier}</span>
                    <p style="color:var(--text-secondary);margin-top:0.5rem">Base: ${formatMoneyFull(player.basePrice)}</p>
                    <p class="tv-current-bid">${hb ? `Current Bid: ${formatMoneyFull(hb.amount)}` : 'No bids yet'}</p>
                </div>`;
        }
    } else {
        auctionEl.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">⏳</span>
                <p>Waiting for auction to start...</p>
            </div>`;
    }

    renderSponsors();
}

// Auto-refresh handled by setupSSE()

// ============ SETTINGS ============
function openSettingsModal() {
    document.getElementById('settingsBudget').value = state.settings.teamBudget;
    document.getElementById('settingsTeamCount').value = state.settings.teamCount;

    const namesContainer = document.getElementById('teamNamesSettings');
    namesContainer.innerHTML = state.teams.map((team, i) => `
        <div class="input-group" style="padding-bottom: 1rem; border-bottom: 1px solid var(--border); margin-bottom: 1rem;">
            <label style="font-weight:700; color:var(--primary); margin-bottom: 0.5rem;">Team ${i + 1}</label>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <input type="color" value="${team.color}" id="teamColor${i}" style="width:40px; height:38px; border:none; background:none; cursor:pointer;" title="Change Team Color">
                    <input type="text" value="${team.name}" id="teamName${i}" style="flex:1" placeholder="Team name">
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <span style="font-size:0.8rem; color:var(--text-secondary); min-width:60px;">Password:</span>
                    <div style="flex:1; display:flex; gap:0.5rem; position:relative;">
                        <input type="password" value="${team.password || 'team@123'}" id="teamPass${i}" style="flex:1; font-family:monospace; padding-right:40px;" placeholder="Team password">
                        <button type="button" onclick="togglePassVisibility('teamPass${i}', this)" style="position:absolute; right:5px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.1rem; padding:5px;">👁️</button>
                    </div>
                </div>
            </div>
        </div>`).join('');

    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.add('hidden');
}

function saveSettings() {
    const newBudget = parseInt(document.getElementById('settingsBudget').value);
    const newCount = parseInt(document.getElementById('settingsTeamCount').value);

    if (newBudget && newBudget > 0) {
        state.settings.teamBudget = newBudget;
    }

    // Update existing team names and colors
    state.teams.forEach((team, i) => {
        const nameEl = document.getElementById(`teamName${i}`);
        const colorEl = document.getElementById(`teamColor${i}`);
        const passEl = document.getElementById(`teamPass${i}`);
        if (nameEl) team.name = nameEl.value.trim() || team.name;
        if (colorEl) team.color = colorEl.value;
        if (passEl) team.password = passEl.value.trim() || team.password || 'team@123';
    });

    // Handle team count change
    if (newCount && newCount !== state.teams.length) {
        if (newCount > state.teams.length) {
            // Add teams
            for (let i = state.teams.length; i < newCount; i++) {
                state.teams.push({
                    id: i,
                    name: DEFAULT_TEAM_NAMES[i] || `Team ${i + 1}`,
                    color: DEFAULT_TEAM_COLORS[i] || '#888888',
                    password: 'team@123',
                    budget: state.settings.teamBudget,
                    spent: 0,
                    players: []
                });
            }
        } else {
            // Remove extra teams (only if they have no players)
            const toRemove = state.teams.slice(newCount);
            const hasPlayers = toRemove.some(t => t.players.length > 0);
            if (hasPlayers) {
                showToast('Cannot remove teams that have purchased players', 'error');
                return;
            }
            state.teams = state.teams.slice(0, newCount);
        }
        state.settings.teamCount = newCount;
    }

    // Update budgets for teams without spending
    state.teams.forEach(team => {
        if (team.spent === 0) {
            team.budget = state.settings.teamBudget;
        }
    });

    saveState();
    closeSettingsModal();
    populateTeamSelect();
    renderAdminDashboard();
    showToast('Settings saved!', 'success');
}

function resetAllData() {
    if (!confirm('⚠️ This will delete ALL data — players, teams, auction history. Are you sure?')) return;
    if (!confirm('This action cannot be undone. Continue?')) return;

    state = getDefaultState();
    initTeams();
    saveState();
    populateTeamSelect();
    renderAdminDashboard();
    showToast('All data has been reset', 'info');
}

// ============ CELEBRATION ANIMATION ============
function triggerSoldAnimation(playerName, teamName, priceText, teamColor) {
    const overlay = document.getElementById('soldAnimationOverlay');
    const subtext = document.getElementById('soldSubtext');
    const fireworks = document.getElementById('fireworksContainer');
    
    if (!overlay || !subtext || !fireworks) return;

    subtext.textContent = `${playerName} → ${teamName} for ${priceText}`;
    subtext.style.backgroundColor = teamColor;
    
    // Reset animation states
    const stamp = overlay.querySelector('.sold-stamp');
    if (stamp) {
        stamp.style.animation = 'none';
        stamp.offsetHeight; // trigger reflow
        stamp.style.animation = null;
    }

    subtext.style.animation = 'none';
    subtext.offsetHeight;
    subtext.style.animation = null;

    overlay.classList.remove('hidden');

    // Generate firework waves
    fireworks.innerHTML = '';
    let waveCount = 0;
    const fwInterval = setInterval(() => {
        if (waveCount++ > 4) { clearInterval(fwInterval); return; } // fire for ~4 seconds
        for (let i = 0; i < 25; i++) {
            const p = document.createElement('div');
            p.className = 'firework-particle';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.background = ['#ff6b35', '#00d4ff', '#00e676', '#a855f7', '#ffab00', '#ffffff'][Math.floor(Math.random() * 6)];
            
            // Randomize height (negative relative to bottom)
            const targetY = - (window.innerHeight * 0.4 + Math.random() * window.innerHeight * 0.6);
            p.style.setProperty('--y-end', targetY + 'px');
            p.style.animationDuration = (0.8 + Math.random() * 1.2) + 's';
            
            fireworks.appendChild(p);
            
            // Cleanup particle
            setTimeout(() => { if (p.parentNode) p.remove(); }, 2500);
        }
    }, 800);

    // Initial burst
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'firework-particle';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.background = '#' + Math.floor(Math.random()*16777215).toString(16);
        const targetY = - (window.innerHeight * 0.5 + Math.random() * window.innerHeight * 0.5);
        p.style.setProperty('--y-end', targetY + 'px');
        p.style.animationDuration = '1s';
        fireworks.appendChild(p);
    }

    // Hide everything after ~7.5 seconds
    setTimeout(() => {
        overlay.classList.add('hidden');
        clearInterval(fwInterval);
        setTimeout(() => { fireworks.innerHTML = ''; }, 600); // allow fade out
    }, 7500);
}

// ============ SPONSORS ============
function renderSponsors() {
    const container = document.getElementById('sponsorsGrid');
    if (!container || !state.settings.sponsors) return;

    container.innerHTML = state.settings.sponsors.map((sponsor, i) => `
        <div class="sponsor-box">
            <div class="sponsor-logo-box" onclick="if(document.body.classList.contains('admin-mode')) triggerSponsorLogoUpload(${i})">
                ${sponsor.logo ? `<img src="${sponsor.logo}" alt="Sponsor Logo">` : '🖼️'}
                <div class="sponsor-logo-overlay">📸 Upload Logo</div>
            </div>
            ${document.body.classList.contains('admin-mode') ? 
                `<input type="text" class="sponsor-name-input" placeholder="Sponsor Name" value="${sponsor.name}" onchange="updateSponsorName(${i}, this.value)">` :
                `<div class="sponsor-name-display">${sponsor.name}</div>`
            }
        </div>
    `).join('');
}

function triggerSponsorLogoUpload(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            state.settings.sponsors[index].logo = ev.target.result;
            saveState();
            renderSponsors();
            showToast('Sponsor logo updated!', 'success');
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function updateSponsorName(index, name) {
    state.settings.sponsors[index].name = name;
    saveState();
    showToast('Sponsor name saved!', 'success');
}

// ============ THEME TOGGLE ============
function initTheme() {
    const savedTheme = localStorage.getItem('volleysphere_theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('themeToggleBtn').textContent = '🌙';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.getElementById('themeToggleBtn').textContent = '☀️';
    }
}

function toggleTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('volleysphere_theme', 'dark');
        document.getElementById('themeToggleBtn').textContent = '☀️';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('volleysphere_theme', 'light');
        document.getElementById('themeToggleBtn').textContent = '🌙';
    }
}

// ============ SPLASH ANIMATION ============
function triggerSplashAnimation() {
    const splash = document.getElementById('splashScreen');
    const particles = document.getElementById('bgParticles');
    if (!splash) return;
    
    // Completely remove particles from DOM processing to save mobile resources
    if (particles) particles.style.display = 'none';
    
    // We clone the node to restart animations cleanly on repeated logouts
    const newSplash = splash.cloneNode(true);
    splash.parentNode.replaceChild(newSplash, splash);
    
    newSplash.classList.remove('hidden');
    
    setTimeout(() => {
        newSplash.classList.add('hidden');
        if (particles) particles.style.display = 'block';
    }, 2200);
}

function togglePassVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}
