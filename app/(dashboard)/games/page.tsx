import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, Search } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/chess/utils'

export default async function GamesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Oyunlarım</h1>
          <p className="text-zinc-400 text-sm mt-1">{games?.length ?? 0} oyun arşivde</p>
        </div>
        <Link href="/games/upload">
          <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
            <Upload className="w-4 h-4" />
            PGN Yükle
          </Button>
        </Link>
      </div>

      {!games || games.length === 0 ? (
        <div className="text-center py-24 bg-zinc-900 rounded-2xl border border-zinc-800">
          <div className="text-6xl mb-4">♟️</div>
          <h2 className="text-white text-lg font-semibold mb-2">Henüz oyun yok</h2>
          <p className="text-zinc-400 text-sm mb-6">İlk oyununu yükleyerek başla.</p>
          <Link href="/games/upload">
            <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
              <Upload className="w-4 h-4" />
              PGN Yükle
            </Button>
          </Link>
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
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Analiz</th>
                <th className="text-left text-zinc-500 font-medium px-4 py-3">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
