import React, { useState } from 'react'
import { useAuction } from '../context/AuctionContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export default function Login() {
  const { state, login } = useAuction()
  const [activeTab, setActiveTab] = useState<'admin' | 'team' | 'audience'>('admin')
  const [password, setPassword] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [error, setError] = useState('')

  const handleAdminLogin = () => {
    if (password === 'admin@123') {
      login({ role: 'admin' })
    } else {
      setError('Invalid admin password')
    }
  }

  const handleTeamLogin = () => {
    if (!selectedTeam) return setError('Please select a team')
    const team = state?.teams.find(t => t.id === parseInt(selectedTeam))
    if (password === (team?.password || 'team@123')) {
      login({ role: 'team', teamId: parseInt(selectedTeam) })
    } else {
      setError('Invalid team password')
    }
  }

  const handleAudienceLogin = () => {
    login({ role: 'audience' })
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-[url('https://t3.ftcdn.net/jpg/04/22/84/12/360_F_422841241_OR69MNhNG3Sxl6pmrKwuoBZPaZpZLt1a.jpg')] bg-cover bg-center">
      <div className="absolute inset-0 bg-[#060613]/80 backdrop-blur-sm" />
      
      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4 animate-bounce">
            <svg viewBox="0 0 100 100" width="60" height="60">
              <circle cx="50" cy="50" r="45" fill="none" stroke="orange" strokeWidth="2" />
              <path d="M50 5 Q80 30 50 50 Q20 70 50 95" fill="none" stroke="orange" strokeWidth="1" />
              <path d="M5 50 Q30 20 50 50 Q70 80 95 50" fill="none" stroke="orange" strokeWidth="1" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">VPL</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">Volleyball Premier League</p>
        </div>

        <div className="flex p-1 mb-6 rounded-xl bg-white/5 gap-1">
          {(['admin', 'team', 'audience'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold capitalize rounded-lg transition-all duration-300 ${
                activeTab === tab ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {activeTab === 'admin' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Password</label>
                <Input 
                  type="password" 
                  placeholder="Enter admin password" 
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button onClick={handleAdminLogin} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl">
                Login as Admin
              </Button>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Team</label>
                <Select onValueChange={setSelectedTeam}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Choose Your Team" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#12122e] border-white/10 text-white">
                    {state?.teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Password</label>
                <Input 
                  type="password" 
                  placeholder="Enter team password" 
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-orange-500/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button onClick={handleTeamLogin} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl">
                Login as Team
              </Button>
            </div>
          )}

          {activeTab === 'audience' && (
            <div className="space-y-6 text-center animate-in fade-in duration-300">
              <p className="text-slate-400 text-sm">Enter as a guest to watch the auction live!</p>
              <Button onClick={handleAudienceLogin} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl">
                Enter Live Audience View
              </Button>
            </div>
          )}

          {error && (
            <div className="p-3 text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg text-center animate-shake">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
