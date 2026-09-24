import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchUpgrades, buyUpgrade } from '../services/api'
import { UpgradeOption } from '../types'
import toast from 'react-hot-toast'

export const Hive: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const [upgrades, setUpgrades] = useState<UpgradeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [buyingId, setBuyingId] = useState<string | null>(null)

  const loadUpgrades = async () => {
    try {
      const data = await fetchUpgrades()
      setUpgrades(data)
    } catch (err) {
      // Fallback upgrades
      setUpgrades([
        {
          id: 'up-1',
          name: 'Golden Nectar Concentrate',
          description: 'High purity nectar drop that supercharges bee production.',
          power_bonus: 15,
          cost_honey: 1000,
          icon: '🍯',
          category: 'nectar',
        },
        {
          id: 'up-2',
          name: 'Queen Bee Swarm Leader',
          description: 'Recruit a queen bee to coordinate worker bees with 2x efficiency.',
          power_bonus: 50,
          cost_honey: 3500,
          icon: '👑',
          category: 'queen',
        },
        {
          id: 'up-3',
          name: 'Hexagon Storage Vault',
          description: 'Expand honeycomb architecture to hold more honey before harvest.',
          power_bonus: 120,
          cost_honey: 10000,
          icon: '📐',
          category: 'hive',
        },
        {
          id: 'up-4',
          name: 'Royal Jelly Extractor',
          description: 'Premium royal jelly that supercharges every bee in your swarm.',
          power_bonus: 300,
          cost_honey: 25000,
          icon: '✨',
          category: 'nectar',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUpgrades()
  }, [])

  const handleBuy = async (upgrade: UpgradeOption) => {
    if (!user || user.honey_balance < upgrade.cost_honey) {
      toast.error('Insufficient Honey balance!')
      return
    }

    setBuyingId(upgrade.id)
    try {
      await buyUpgrade(upgrade.id)
      toast.success(`Upgraded ${upgrade.name}! +${upgrade.power_bonus} H/h ⚡`)
      await refreshUser()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Upgrade failed')
    } finally {
      setBuyingId(null)
    }
  }

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto min-h-screen bg-hive-aura">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gold-gradient flex items-center gap-2">
          <span>⚡</span> Power Up Hive
        </h1>
        <p className="text-xs text-stone-400 mt-1">
          Invest your Honey balance to permanently increase your hourly earning rate.
        </p>
      </div>

      {/* User Stats Card */}
      {user && (
        <div className="glass-card p-4 rounded-3xl mb-6 flex justify-between items-center shadow-lg">
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-semibold">Current Bee Power</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">{user.bee_power} H/h ⚡</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-stone-400 uppercase font-semibold">Honey Balance</div>
            <div className="text-lg font-black text-gold-gradient mt-0.5">{user.honey_balance.toLocaleString()} 🍯</div>
          </div>
        </div>
      )}

      {/* Upgrades List */}
      {loading ? (
        <div className="text-center py-16 text-stone-400 text-xs">Loading upgrades...</div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {upgrades.map((upgrade) => {
            const canAfford = user ? user.honey_balance >= upgrade.cost_honey : false

            return (
              <div
                key={upgrade.id}
                className="glass-card-interactive p-4 rounded-3xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                    {upgrade.icon}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-stone-100 text-xs">{upgrade.name}</h3>
                    <p className="text-[11px] text-stone-400 line-clamp-2 mt-0.5">{upgrade.description}</p>
                    <div className="mt-1 text-xs font-black text-amber-400 flex items-center gap-1">
                      <span>+{upgrade.power_bonus} Bee Power</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <button
                    onClick={() => handleBuy(upgrade)}
                    disabled={!canAfford || buyingId === upgrade.id}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                      canAfford
                        ? 'btn-gold shadow-md active:scale-95'
                        : 'bg-stone-900/80 text-stone-500 border border-stone-800 cursor-not-allowed'
                    }`}
                  >
                    {buyingId === upgrade.id
                      ? 'Upgrading...'
                      : `${upgrade.cost_honey.toLocaleString()} 🍯`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
