export type Tier = 'A' | 'B' | 'C' | 'D';

export interface Player {
  id: number;
  name: string;
  photo: string | null;
  tier: Tier;
  basePrice: number;
  status: 'available' | 'bidding' | 'sold' | 'unsold';
  soldTo: number | null;
  soldPrice: number | null;
}

export interface TeamPlayer {
  id: number;
  name: string;
  photo: string | null;
  tier: Tier;
  price: number;
}

export interface Team {
  id: number;
  name: string;
  color: string;
  password?: string;
  budget: number;
  spent: number;
  players: TeamPlayer[];
}

export interface Bid {
  teamId: number;
  amount: number;
  time: string;
}

export interface Auction {
  playerId: number;
  bids: Bid[];
  highestBid: {
    teamId: number;
    amount: number;
  } | null;
}

export interface AuctionHistory {
  playerId: number;
  playerName: string;
  teamId?: number;
  price?: number;
  result: 'sold' | 'unsold';
  time: string;
}

export interface Sponsor {
  name: string;
  logo: string | null;
}

export interface Settings {
  teamBudget: number;
  teamCount: number;
  sponsors: Sponsor[];
}

export interface AppState {
  settings: Settings;
  teams: Team[];
  players: Player[];
  currentAuction: Auction | null;
  auctionHistory: AuctionHistory[];
  nextPlayerId: number;
}

export interface UserSession {
  role: 'admin' | 'team' | 'audience';
  teamId?: number;
}
