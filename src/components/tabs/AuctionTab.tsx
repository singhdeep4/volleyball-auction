import React from 'react'
import { useAuction } from '../../context/AuctionContext'
import { Button } from '../ui/button'
import { formatMoney, formatMoneyFull } from '../../lib/utils' // Need to move these helpers
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'

// Helper for money (will move to utils)
const TIER_LABELS = { A: 'Tier A', B: 'Tier B', C: 'Tier C', D: 'Tier D' };

export default function AuctionTab() {
  const { state, startAuction, cancelAuction, placeBid, confirmSale, markUnsold } = useAuction()

  if (!state) return null

  const availablePlayers = state.players.filter(p => p.status === 'available')
  const currentAuction = state.currentAuction
  const auctionPlayer = currentAuction ? state.players.find(p => p.id === currentAuction.playerId) : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-6">
      {/* Left: Available Players */}
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Available</h3>
            <Badge variant="secondary" className="bg-orange-600 text-white border-none">{availablePlayers.length}</Badge>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {availablePlayers.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">No players available</p>
            ) : (
              availablePlayers.map(player => (
                <div 
                  key={player.id}
                  className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer transition-all"
                  onClick={() => startAuction(player.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {player.photo ? <img src={player.photo} className="w-full h-full object-cover" /> : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{player.name}</p>
                    <p className="text-[0.65rem] text-slate-500 font-bold uppercase">{player.tier} • {formatMoney(player.basePrice)}</p>
                  </div>
                  <Button size="sm" className="opacity-0 group-hover:opacity-100 h-7 text-[0.6rem] font-black uppercase bg-orange-600 hover:bg-orange-700">Auction</Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Center: Live Auction Display */}
      <div className="space-y-6">
        {!currentAuction || !auctionPlayer ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-12 rounded-3xl border-2 border-dashed border-white/5 bg-white/[0.02]">
            <div className="text-6xl opacity-20 mb-4">🏐</div>
            <h2 className="text-2xl font-bold text-slate-400">No Active Auction</h2>
            <p className="text-slate-500 mt-2 max-w-xs">Select a player from the list on the left to start the bidding process.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Player Card */}
            <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-orange-500/20 to-blue-500/10 border border-orange-500/30 flex items-center gap-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              
              <div className="relative w-40 h-40 rounded-2xl bg-slate-900 border-2 border-orange-500/50 flex-shrink-0 overflow-hidden shadow-2xl">
                {auctionPlayer.photo ? <img src={auctionPlayer.photo} className="w-full h-full object-cover" /> : <div className="text-6xl flex items-center justify-center h-full">👤</div>}
              </div>

              <div className="relative flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[0.65rem] font-black tracking-widest uppercase mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE BIDDING
                </div>
                <h1 className="text-5xl font-black tracking-tighter mb-2">{auctionPlayer.name}</h1>
                <div className="flex items-center gap-4">
                  <Badge className={`bg-orange-600 text-white border-none font-bold`}>{TIER_LABELS[auctionPlayer.tier]}</Badge>
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Base: {formatMoneyFull(auctionPlayer.basePrice)}</span>
                </div>
              </div>
            </div>

            {/* Bidding Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-6 rounded-3xl border transition-all duration-500 flex flex-col items-center justify-center ${currentAuction.highestBid ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                <p className="text-[0.65rem] font-black text-slate-500 uppercase tracking-widest mb-1">Current Highest Bid</p>
                <p className="text-5xl font-black text-white tracking-tighter">
                  {currentAuction.highestBid ? formatMoneyFull(currentAuction.highestBid.amount) : formatMoneyFull(auctionPlayer.basePrice)}
                </p>
                <p className="text-sm font-bold text-green-400 mt-1">
                  {currentAuction.highestBid ? `by ${state.teams.find(t => t.id === currentAuction.highestBid?.teamId)?.name}` : 'Starting at Base Price'}
                </p>
              </div>

              {/* Bidding Controls for Admin */}
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-center gap-4">
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 h-14 bg-green-600 hover:bg-green-700 font-bold rounded-2xl"
                    disabled={!currentAuction.highestBid}
                    onClick={() => confirmSale(currentAuction.highestBid!.amount)}
                  >
                    ✅ SELL PLAYER
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 h-14 border-white/10 hover:bg-red-500/10 hover:text-red-400 font-bold rounded-2xl"
                    onClick={markUnsold}
                  >
                    ❌ MARK UNSOLD
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full text-slate-500 hover:text-white"
                  onClick={cancelAuction}
                >
                  🔄 Cancel Auction
                </Button>
              </div>
            </div>

            {/* Quick Bid Grid */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Bidding</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {state.teams.map(team => {
                  const remaining = team.budget - team.spent;
                  const isHighest = currentAuction.highestBid?.teamId === team.id;
                  const nextBid = (currentAuction.highestBid?.amount || auctionPlayer.basePrice) + 100000;

                  return (
                    <div 
                      key={team.id}
                      className={`p-3 rounded-2xl border transition-all ${isHighest ? 'bg-orange-500/20 border-orange-500/50' : 'bg-white/5 border-white/10'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                        <p className="text-[0.65rem] font-bold truncate">{team.name}</p>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mb-2">{formatMoney(remaining)} left</p>
                      <Button 
                        size="sm" 
                        variant={isHighest ? "default" : "secondary"}
                        className={`w-full text-[0.6rem] font-black uppercase ${isHighest ? 'bg-orange-600' : ''}`}
                        onClick={() => placeBid(team.id, nextBid)}
                      >
                        Bid {formatMoney(nextBid)}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: History & Budgets */}
      <div className="space-y-6">
        {/* Budgets */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Team Budgets</h3>
          <div className="space-y-4">
            {state.teams.map(team => {
              const remaining = team.budget - team.spent;
              const percent = (remaining / team.budget) * 100;
              return (
                <div key={team.id} className="space-y-1.5">
                  <div className="flex justify-between text-[0.65rem] font-bold">
                    <span className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: team.color }} />
                      {team.name}
                    </span>
                    <span className={remaining < 1000000 ? 'text-red-400' : 'text-slate-300'}>{formatMoney(remaining)}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-1000" 
                      style={{ width: `${percent}%`, backgroundColor: team.color }} 
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent History */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Log</h3>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {state.auctionHistory.length === 0 ? (
              <p className="text-center text-[0.65rem] text-slate-500 py-4">History is empty</p>
            ) : (
              [...state.auctionHistory].reverse().slice(0, 10).map((entry, i) => (
                <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[0.65rem]">
                  <div className="flex justify-between font-black uppercase mb-1">
                    <span className={entry.result === 'sold' ? 'text-green-400' : 'text-red-400'}>{entry.result}</span>
                    <span className="text-slate-600">{entry.time}</span>
                  </div>
                  <p className="font-bold text-slate-300">{entry.playerName}</p>
                  {entry.result === 'sold' && (
                    <p className="text-slate-500">to {state.teams.find(t => t.id === entry.teamId)?.name} for {formatMoney(entry.price || 0)}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
