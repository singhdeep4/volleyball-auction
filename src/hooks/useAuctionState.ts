import { useState, useEffect, useCallback } from 'react';
import { AppState, UserSession, Player, Team, Tier } from '../types';

const TIER_BASE_PRICES: Record<Tier, number> = { A: 1000000, B: 500000, C: 300000, D: 200000 };

export function useAuctionState() {
  const [state, setState] = useState<AppState | null>(null);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      if (data.state) {
        setState(data.state);
      }
    } catch (e) {
      console.error('Failed to load state:', e);
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
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.status !== 'available') return;

    const newState = { ...state };
    const p = newState.players.find(p => p.id === playerId)!;
    p.status = 'bidding' as const;
    newState.currentAuction = {
      playerId,
      bids: [],
      highestBid: null
    };
    saveState(newState);
  };

  // ... more methods like placeBid, confirmSale, etc.

  return {
    state,
    currentUser,
    login,
    logout,
    startAuction,
    // ...
  };
}
