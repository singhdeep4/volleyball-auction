import React from 'react'
import { useAuction } from '../context/AuctionContext'
import { Button } from './ui/button'
import { formatMoney, formatMoneyFull } from '../lib/utils'
import { LogOut, Trophy, Wallet, Users } from 'lucide-react'
import { Badge } from './ui/badge'

export default function TeamDashboard() {
  const { state, currentUser, logout } = useAuction()

  if (!state || !currentUser || currentUser.role !== 'team') return null

  const team = state.teams.find(t => t.id === currentUser.teamId)
  if (!team) return <div className="p-20 text-center">Team not found</div>

  const remaining = team.budget - team.spent
  const currentAuction = state.currentAuction
  const auctionPlayer = currentAuction ? state.players.find(p => p.id === currentAuction.playerId) : null

  return (
    <div className="min-h-screen flex flex-col bg-[#060613]">
      <nav className="h-16 border-b border-white/10 bg-[#060613]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🏐</div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tighter leading-none">{team.name}</span>
            <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Team Owner View</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={logout}
          className="text-red-400 hover:text-red-300 hover:bg-red-400/5"
        >
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Wallet className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Remaining Budget</p>
              <p className="text-3xl font-black text-white tracking-tighter">{formatMoneyFull(remaining)}</p>
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Roster Size</p>
              <p className="text-3xl font-black text-white tracking-tighter">{team.players.length}</p>
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <Trophy className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Total Spent</p>
              <p className="text-3xl font-black text-white tracking-tighter">{formatMoneyFull(team.spent)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Auction Feed */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tighter flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Auction Feed
            </h2>
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md min-h-[400px] flex flex-col items-center justify-center text-center">
              {!currentAuction || !auctionPlayer ? (
                <div className="space-y-4">
                  <div className="text-6xl opacity-10">⏳</div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Waiting for Auction...</p>
                </div>
              ) : (
                <div className="w-full space-y-6 animate-in fade-in duration-500">
                  <div className="w-32 h-32 rounded-3xl bg-slate-800 border-2 border-orange-500/30 mx-auto overflow-hidden shadow-2xl">
                    {auctionPlayer.photo ? <img src={auctionPlayer.photo} className="w-full h-full object-cover" /> : <div className="text-5xl flex items-center justify-center h-full">👤</div>}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tighter">{auctionPlayer.name}</h3>
                    <Badge className="mt-2 bg-orange-600 border-none">{auctionPlayer.tier}</Badge>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 max-w-sm mx-auto">
                    <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Highest Bid</p>
                    <p className="text-4xl font-black text-white tracking-tighter">
                      {currentAuction.highestBid ? formatMoneyFull(currentAuction.highestBid.amount) : formatMoneyFull(auctionPlayer.basePrice)}
                    </p>
                    <p className="text-sm font-bold text-orange-400 mt-1">
                      {currentAuction.highestBid ? `by ${state.teams.find(t => t.id === currentAuction.highestBid?.teamId)?.name}` : 'Base Price'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Roster List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tighter flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" /> Your Roster
            </h2>
            <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md min-h-[400px]">
              {team.players.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
                  <div className="text-4xl opacity-10">👥</div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No players purchased yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {team.players.map(p => (
                    <div key={p.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex-shrink-0">
                        {p.photo ? <img src={p.photo} className="w-full h-full object-cover" /> : <div className="text-xl flex items-center justify-center h-full">👤</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{p.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge className="h-4 text-[0.5rem] px-1.5 py-0 bg-slate-800 border-none">{p.tier}</Badge>
                          <span className="text-[0.65rem] font-bold text-green-400">{formatMoney(p.price)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="p-8 border-t border-white/5 bg-black/20 text-center text-xs text-slate-600 font-bold tracking-widest uppercase">
        VPL Season 2026 • Live Auction Dashboard
      </footer>
    </div>
  )
}
