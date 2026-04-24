import { useState } from 'react'
import { useAuction } from './context/AuctionContext'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import TeamDashboard from './components/TeamDashboard'
import { Toaster } from './components/ui/toaster'

function App() {
  const { currentUser, loading } = useAuction()
  const [showSplash, setShowSplash] = useState(true)

  // Handle splash screen timeout
  useState(() => {
    const timer = setTimeout(() => setShowSplash(false), 2200)
    return () => clearTimeout(timer)
  })

  if (loading) return null

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#060613] text-white">
        <div className="text-6xl animate-bounce mb-4">🏐</div>
        <div className="text-4xl font-bold tracking-tighter">VPL</div>
        <div className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-2">Volleyball Premier League</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#060613] text-white font-sans selection:bg-orange-500/30">
      {!currentUser ? (
        <Login />
      ) : currentUser.role === 'admin' || currentUser.role === 'audience' ? (
        <AdminDashboard />
      ) : (
        <TeamDashboard />
      )}
      <Toaster />
    </div>
  )
}

export default App
