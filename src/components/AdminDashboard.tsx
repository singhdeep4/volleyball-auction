import React, { useState } from 'react'
import { useAuction } from '../context/AuctionContext'
import GradientMenu from './ui/gradient-menu'
import { Button } from './ui/button'
import { LogOut, Settings } from 'lucide-react'

import AuctionTab from './tabs/AuctionTab'
import PlayersTab from './tabs/PlayersTab'

const TeamsTab = () => <div className="p-20 text-center text-slate-500 font-bold border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">Teams Tab (Coming Soon)</div>
const ResultsTab = () => <div className="p-20 text-center text-slate-500 font-bold border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">Results Tab (Coming Soon)</div>

export default function AdminDashboard() {
  const { currentUser, logout } = useAuction()
  const [activeTab, setActiveTab] = useState('auction')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-white/10 bg-[#060613]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🏐</div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tighter leading-none">VPL</span>
            <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Auction System</span>
          </div>
          {currentUser?.role === 'admin' && (
            <span className="ml-2 px-2 py-0.5 rounded-md bg-orange-600 text-[0.6rem] font-black uppercase">Admin</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentUser?.role === 'admin' && (
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/5">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/5"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </nav>

      {/* Modern Gradient Menu Navigation */}
      <GradientMenu activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'auction' && <AuctionTab />}
          {activeTab === 'players' && <PlayersTab />}
          {activeTab === 'teams' && <TeamsTab />}
          {activeTab === 'results' && <ResultsTab />}
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="p-8 border-t border-white/5 bg-black/20 text-center text-xs text-slate-600 font-bold tracking-widest uppercase">
        Volleyball Premier League © 2026
      </footer>
    </div>
  )
}
