'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Upload, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from '@/lib/chess/utils'
import type { Game } from '@/types'

type Tab = 'all' | 'lichess' | 'chesscom' | 'otb'

const TABS: { id: Tab; label: string; filter: (g: Game) => boolean }[] = [
  { id: 'all', label: 'Hepsi', filter: () => true },
  { id: 'lichess', label: 'Lichess', filter: g => g.platform === 'lichess' },
  { id: 'chesscom', label: 'Chess.com', filter: g => g.platform === 'chess.com' },
  { id: 'otb', label: 'Masa Başı', filter: g => g.platform === 'OTB (Masa başı)' || g.platform === 'otb' },
]

interface Props {
  initialGames: Game[]
}

export function GamesTabs({ initialGames }: Props) {
  const [games, setGames] = useState(initialGames)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = TABS.find(t => t.id === activeTab)!.filter
  const visible = games.filter(filtered)

  async function handleDelete(gameId: string) {
    if (!confirm('Bu oyunu silmek istediğinden emin misin? Analiz verileri de silinecek.')) return
    setDeleting(gameId)
    try {
      const res = await fetch(`/api/games/${gameId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Silinemedi')
      }
      setGames(prev => prev.filter(g => g.id !== gameId))
      toast.success('Oyun silindi')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sekmeler */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const count = games.filter(tab.filter).length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-zinc-600 text-zinc-200' : 'bg-zinc-800 text-zinc-600'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* OTB sekme için extra buton */}
      {activeTab === 'otb' && (
        <Link href="/games/upload">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 text-sm">
            <Upload className="w-4 h-4" />
            Manuel Oyun Ekle
          </Button>
        </Link>
      )}

      {/* Tablo veya boş durum */}
      {visible.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900 rounded-2xl border border-zinc-800">
          <div className="text-4xl mb-3">♟️</div>
          <p className="text-zinc-400 text-sm">
            {activeTab === 'otb'
              ? 'Henüz masa başı oyunu yok. PGN yükleyerek ekleyebilirsin.'
              : activeTab === 'lichess'
              ? 'Lichess oyunu yok. Ayarlar\'dan hesabını bağla.'
              : activeTab === 'chesscom'
              ? 'Chess.com oyunu yok. Ayarlar\'dan hesabını bağla.'
              : 'Henüz hiç oyun yok.'}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Rakip</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Açılış</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Renk</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Sonuç</th>
                {activeTab === 'all' && (
                  <th className="text-left text-zinc-500 font-medium px-4 py-3">Platform</th>
                )}
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Analiz</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Tarih</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map(game => (
                <tr key={game.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/games/${game.id}`} className="text-white hover:text-amber-400 font-medium flex items-center gap-1">
                      {game.opponent ?? 'Bilinmiyor'}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 max-w-[180px] truncate">
                    {game.opening_name ?? game.eco_code ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {game.user_color === 'white' ? '♔ Beyaz' : game.user_color === 'black' ? '♚ Siyah' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {game.result === 'win' && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Kazandı</Badge>}
                    {game.result === 'loss' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Kaybetti</Badge>}
                    {game.result === 'draw' && <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Berabere</Badge>}
                    {!game.result && <span className="text-zinc-600">—</span>}
                  </td>
                  {activeTab === 'all' && (
                    <td className="px-4 py-3">
                      {game.platform === 'lichess' && <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20 text-xs">Lichess</Badge>}
                      {game.platform === 'chess.com' && <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-xs">Chess.com</Badge>}
                      {(game.platform === 'OTB (Masa başı)' || game.platform === 'otb') && <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-xs">OTB</Badge>}
                      {!game.platform && <span className="text-zinc-600 text-xs">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {game.analysis_status === 'completed' && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Tamamlandı</Badge>}
                    {game.analysis_status === 'pending' && <Badge className="bg-zinc-700/50 text-zinc-500 border-zinc-700">Bekliyor</Badge>}
                    {game.analysis_status === 'in_progress' && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Analiz ediliyor</Badge>}
                    {game.analysis_status === 'failed' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Başarısız</Badge>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                    {formatDistanceToNow(game.played_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 h-7 w-7 transition-all"
                      disabled={deleting === game.id}
                      onClick={() => handleDelete(game.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
