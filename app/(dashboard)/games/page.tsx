import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Upload, Download } from 'lucide-react'
import { GamesTable } from '@/components/games/GamesTable'

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
        <div className="flex gap-2">
          <Link href="/games/import">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2">
              <Download className="w-4 h-4" />
              İçe Aktar
            </Button>
          </Link>
          <Link href="/games/upload">
            <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
              <Upload className="w-4 h-4" />
              PGN Yükle
            </Button>
          </Link>
        </div>
      </div>

      {!games || games.length === 0 ? (
        <div className="text-center py-24 bg-zinc-900 rounded-2xl border border-zinc-800">
          <div className="text-6xl mb-4">♟️</div>
          <h2 className="text-white text-lg font-semibold mb-2">Henüz oyun yok</h2>
          <p className="text-zinc-400 text-sm mb-6">Lichess/Chess.com&apos;dan çek veya PGN yapıştır.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/games/import">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
                <Download className="w-4 h-4" />
                İçe Aktar
              </Button>
            </Link>
            <Link href="/games/upload">
              <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
                <Upload className="w-4 h-4" />
                PGN Yükle
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <GamesTable initialGames={games} />
      )}
    </div>
  )
}
