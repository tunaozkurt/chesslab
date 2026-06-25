'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from '@/lib/chess/utils'
import type { Game } from '@/types'

interface Props {
  initialGames: Game[]
}

export function GamesTable({ initialGames }: Props) {
  const [games, setGames] = useState(initialGames)
  const [deleting, setDeleting] = useState<string | null>(null)

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

  if (games.length === 0) {
    return (
      <p className="text-center text-zinc-500 py-12">Tüm oyunlar silindi.</p>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-zinc-500 font-medium px-4 py-3">Rakip</th>
            <th className="text-left text-zinc-500 font-medium px-4 py-3">Açılış</th>
            <th className="text-left text-zinc-500 font-medium px-4 py-3">Renk</th>
            <th className="text-left text-zinc-500 font-medium px-4 py-3">Sonuç</th>
            <th className="text-left text-zinc-500 font-medium px-4 py-3">Analiz</th>
            <th className="text-left text-zinc-500 font-medium px-4 py-3">Tarih</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
              <td className="px-4 py-3">
                <Link href={`/games/${game.id}`} className="text-white hover:text-amber-400 font-medium">
                  {game.opponent ?? 'Bilinmiyor'}
                </Link>
              </td>
              <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate">
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
              <td className="px-4 py-3">
                {game.analysis_status === 'completed' && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Tamamlandı</Badge>}
                {game.analysis_status === 'pending' && <Badge className="bg-zinc-700/50 text-zinc-500 border-zinc-700">Bekliyor</Badge>}
                {game.analysis_status === 'in_progress' && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Analiz ediliyor</Badge>}
                {game.analysis_status === 'failed' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Başarısız</Badge>}
              </td>
              <td className="px-4 py-3 text-zinc-500">
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
  )
}
