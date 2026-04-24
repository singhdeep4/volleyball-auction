import React, { useState } from 'react'
import { useAuction } from '../../context/AuctionContext'
import { Button } from '../ui/button'
import { formatMoney } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Plus, Edit2, Trash2, RotateCcw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tier } from '../../types'

export default function PlayersTab() {
  const { state, addPlayer, updatePlayer, deletePlayer, revertSale } = useAuction()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<any>(null)
  
  // Form State
  const [name, setName] = useState('')
  const [tier, setTier] = useState<Tier>('A')
  const [basePrice, setBasePrice] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)

  if (!state) return null

  const handleOpenModal = (player?: any) => {
    if (player) {
      setEditingPlayer(player)
      setName(player.name)
      setTier(player.tier)
      setBasePrice(player.basePrice.toString())
      setPhoto(player.photo)
    } else {
      setEditingPlayer(null)
      setName('')
      setTier('A')
      setBasePrice('')
      setPhoto(null)
    }
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (!name) return
    const price = basePrice ? parseInt(basePrice) : undefined
    if (editingPlayer) {
      updatePlayer(editingPlayer.id, name, tier, price || 0, photo)
    } else {
      addPlayer(name, tier, price, photo)
    }
    setIsModalOpen(false)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter">Player Management</h2>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">{state.players.length} Total Players</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenModal()} className="bg-orange-600 hover:bg-orange-700 font-bold rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> Add Player
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#12122e] border-white/10 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tighter">
                  {editingPlayer ? 'Edit Player' : 'Add New Player'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-4 mb-4">
                  <div 
                    className="w-32 h-32 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-orange-500/50 transition-colors"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                    {photo ? <img src={photo} className="w-full h-full object-cover" /> : <Plus className="w-8 h-8 text-slate-600" />}
                  </div>
                  <input type="file" id="photo-upload" hidden onChange={handlePhotoUpload} accept="image/*" />
                  <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Click to upload photo</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Player Name</label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-orange-500/50"
                    placeholder="Enter player name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tier</label>
                    <Select value={tier} onValueChange={(val: Tier) => setTier(val)}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#12122e] border-white/10 text-white">
                        <SelectItem value="A">Tier A (10L)</SelectItem>
                        <SelectItem value="B">Tier B (5L)</SelectItem>
                        <SelectItem value="C">Tier C (3L)</SelectItem>
                        <SelectItem value="D">Tier D (2L)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Price (₹)</label>
                    <Input 
                      type="number"
                      value={basePrice} 
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="bg-white/5 border-white/10 focus:border-orange-500/50"
                      placeholder="Auto from tier"
                    />
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full bg-orange-600 hover:bg-orange-700 font-bold h-12 rounded-xl mt-4">
                  {editingPlayer ? 'Update Player' : 'Save Player'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.players.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <p className="text-slate-500 font-bold">No players added yet.</p>
          </div>
        ) : (
          state.players.map(player => {
            const team = player.soldTo !== null ? state.teams.find(t => t.id === player.soldTo) : null;
            return (
              <div key={player.id} className="group relative p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/[0.08] transition-all overflow-hidden">
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                  player.status === 'sold' ? 'bg-green-500' : player.status === 'bidding' ? 'bg-orange-500 animate-pulse' : 'bg-slate-700'
                }`} />
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-2xl bg-slate-800 border border-white/10 overflow-hidden mb-4 shadow-xl">
                    {player.photo ? <img src={player.photo} className="w-full h-full object-cover" /> : <div className="text-4xl flex items-center justify-center h-full">👤</div>}
                  </div>
                  <h3 className="text-lg font-bold truncate w-full px-2">{player.name}</h3>
                  <div className="flex items-center gap-2 mt-1 mb-3">
                    <Badge variant="secondary" className="bg-slate-800 text-[0.6rem] font-black uppercase py-0">{player.tier}</Badge>
                    <span className="text-xs font-bold text-slate-500">{formatMoney(player.basePrice)}</span>
                  </div>

                  {player.status === 'sold' && team && (
                    <div className="w-full p-2 rounded-xl bg-green-500/10 border border-green-500/20 mb-4 text-[0.65rem] font-bold text-green-400">
                      Sold to {team.name} for {formatMoney(player.soldPrice)}
                    </div>
                  )}

                  <div className="flex gap-2 w-full mt-auto">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleOpenModal(player)}
                      className="flex-1 h-8 text-[0.65rem] font-bold bg-white/5 hover:bg-white/10"
                    >
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    {player.status === 'sold' ? (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => revertSale(player.id)}
                        className="flex-1 h-8 text-[0.65rem] font-bold text-orange-400 bg-orange-400/5 hover:bg-orange-400/10"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Revert
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deletePlayer(player.id)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
