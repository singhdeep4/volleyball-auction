import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, UserSession, Player, Team, Tier, Auction, Bid, AuctionHistory } from '../types';

interface AuctionContextType {
  state: AppState | null;
  currentUser: UserSession | null;
  loading: boolean;
  login: (session: UserSession) => void;
  logout: () => void;
  startAuction: (playerId: number) => void;
  cancelAuction: () => void;
  placeBid: (teamId: number, amount: number) => void;
  confirmSale: (finalPrice: number) => void;
  markUnsold: () => void;
  addPlayer: (name: string, tier: Tier, basePrice?: number, photo?: string | null) => void;
  updatePlayer: (id: number, name: string, tier: Tier, basePrice: number, photo?: string | null) => void;
  deletePlayer: (id: number) => void;
  revertSale: (playerId: number) => void;
  saveSettings: (budget: number, teamCount: number, teams: Partial<Team>[]) => void;
  resetAllData: () => void;
}

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

const TIER_BASE_PRICES: Record<Tier, number> = { A: 1000000, B: 500000, C: 300000, D: 200000 };

export const AuctionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState | null>(null);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      if (data.state) {
        setState(data.state);
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveState = useCallback(async (newState: AppState) => {
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });
      setState(newState);
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, []);

  useEffect(() => {
    loadState();
    const savedSession = sessionStorage.getItem('volleysphere_session');
    if (savedSession) {
      try {
        setCurrentUser(JSON.parse(savedSession));
      } catch (e) {}
    }

    const evtSource = new EventSource('/api/stream');
    evtSource.onmessage = (e) => {
      if (e.data === 'update') {
        loadState();
      }
    };
    return () => evtSource.close();
  }, [loadState]);

  const login = (session: UserSession) => {
    setCurrentUser(session);
    sessionStorage.setItem('volleysphere_session', JSON.stringify(session));
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('volleysphere_session');
  };

  const startAuction = (playerId: number) => {
    if (!state) return;
    const newState = JSON.parse(JSON.stringify(state)) as AppState;
    const player = newState.players.find(p => p.id === playerId);
    if (!player || player.status !== 'available') return;

    player.status = 'bidding';
    newState.currentAuction = {
      playerId,
      bids: [],
      highestBid: null
    };
    saveState(newState);
  };

  const cancelAuction = () => {
    if (!state || !state.currentAuction) return;
    const newState = JSON.parse(JSON.stringify(state)) as AppState;
    const player = newState.players.find(p => p.id === newState.currentAuction!.playerId);
    if (player) player.status = 'available';
    newState.currentAuction = null;
    saveState(newState);
  };

  const placeBid = (teamId: number, amount: number) => {
    if (!state || !state.currentAuction) return;
    const newState = JSON.parse(JSON.stringify(state)) as AppState;
    const team = newState.teams.find(t => t.id === teamId);
    if (!team) return;

    const remaining = team.budget - team.spent;
    if (amount > remaining) return;

    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    newState.currentAuction.bids.push({ teamId, amount, time });
    
    if (!newState.currentAuction.highestBid || amount > newState.currentAuction.highestBid.amount) {
      newState.currentAuction.highestBid = { teamId, amount };
    }
    saveState(newState);
  };

  const confirmSale = (finalPrice: number) => {
    if (!state || !state.currentAuction || !state.currentAuction.highestBid) return;
    const newState = JSON.parse(JSON.stringify(state)) as AppState;
    const player = newState.players.find(p => p.id === newState.currentAuction!.playerId);
    const team = newState.teams.find(t => t.id === newState.currentAuction!.highestBid!.teamId);
    if (!player || !team) return;

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

    newState.auctionHistory.push({
      playerId: player.id,
      playerName: player.name,
      teamId: team.id,
      price: finalPrice,
      result: 'sold',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    newState.currentAuction = null;
    saveState(newState);
  };

  const markUnsold = () => {
    if (!state || !state.currentAuction) return;
    const newState = JSON.parse(JSON.stringify(state)) as AppState;
    const player = newState.players.find(p => p.id === newState.currentAuction!.playerId);
    if (!player) return;

    player.status = 'unsold';
    newState.auctionHistory.push({
      playerId: player.id,
      playerName: player.name,
      result: 'unsold',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    newState.currentAuction = null;
    saveState(newState);
  };

  const addPlayer = (name: string, tier: Tier, basePrice?: number, photo?: string | null) => {
    if (!state) return;
    const newState = JSON.parse(JSON.stringify(state)) as AppState;
    newState.players.push({
      id: newState.nextPlayerId++,
      name,
      photo: photo || null,
      tier,
      basePrice: basePrice || TIER_BASE_PRICES[tier],
      status: 'available',
      soldTo: null,
      soldPrice: null
    });
    saveState(newState);
  };

  const updatePlayer = (id: number, name: string, tier: Tier, basePrice: number, photo?: string | null) => {
    if (!state) return;
    const newState = JSON.parse(JSON.stringify(state)) as AppState;
    const player = newState.players.find(p => p.id === id);
    if (!player) return;
    player.name = name;
    player.tier = tier;
    player.basePrice = basePrice;
    if (photo) player.photo = photo;
    saveState(newState);
  };

  const deletePlayer = (id: number) => {
    if (!state) return;
    const newState = JSON.parse(JSON.stringify(state)) as AppState;
    newState.players = newState.players.filter(p => p.id !== id);
    saveState(newState);
  };

  const revertSale = (playerId: number) => {
    if (!state) return;
    const newState = JSON.parse(JSON.stringify(state)) as AppState;
    const player = newState.players.find(p => p.id === playerId);
    if (!player || player.status !== 'sold') return;

    const team = newState.teams.find(t => t.id === player.soldTo);
    if (team) {
      team.spent -= player.soldPrice!;
      team.players = team.players.filter(p => p.id !== playerId);
    }

    player.status = 'available';
    player.soldTo = null;
    player.soldPrice = null;
    newState.auctionHistory = newState.auctionHistory.filter(h => h.playerId !== playerId || h.result !== 'sold');

    saveState(newState);
  };

  const saveSettings = (budget: number, teamCount: number, teamConfigs: Partial<Team>[]) => {
    if (!state) return;
    const newState = JSON.parse(JSON.stringify(state)) as AppState;
    newState.settings.teamBudget = budget;
    newState.settings.teamCount = teamCount;

    // Update existing teams
    teamConfigs.forEach((config, i) => {
      if (newState.teams[i]) {
        if (config.name) newState.teams[i].name = config.name;
        if (config.color) newState.teams[i].color = config.color;
        if (config.password) newState.teams[i].password = config.password;
      }
    });

    // Handle count change
    if (teamCount > newState.teams.length) {
      for (let i = newState.teams.length; i < teamCount; i++) {
        newState.teams.push({
          id: i,
          name: `Team ${i + 1}`,
          color: '#888888',
          password: 'team@123',
          budget: budget,
          spent: 0,
          players: []
        });
      }
    } else if (teamCount < newState.teams.length) {
      newState.teams = newState.teams.slice(0, teamCount);
    }

    // Update budgets for teams with no spending
    newState.teams.forEach(t => {
      if (t.spent === 0) t.budget = budget;
    });

    saveState(newState);
  };

  const resetAllData = () => {
    // This should probably be handled by a specific API call, but we can set it to default
    const defaultState: AppState = {
      settings: {
        teamBudget: 10000000,
        teamCount: 4,
        sponsors: [{ name: 'Sponsor 1', logo: null }, { name: 'Sponsor 2', logo: null }, { name: 'Sponsor 3', logo: null }]
      },
      teams: [], // Will be re-initialized by server or client
      players: [],
      currentAuction: null,
      auctionHistory: [],
      nextPlayerId: 1
    };
    saveState(defaultState);
  };

  return (
    <AuctionContext.Provider value={{
      state, currentUser, loading, login, logout, 
      startAuction, cancelAuction, placeBid, confirmSale, markUnsold,
      addPlayer, updatePlayer, deletePlayer, revertSale,
      saveSettings, resetAllData
    }}>
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => {
  const context = useContext(AuctionContext);
  if (context === undefined) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
};
