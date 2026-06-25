import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { GamesTabs } from '@/components/games/GamesTabs'
import { AutoSync } from '@/components/games/AutoSync'

export default async function GamesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: games }, { data: settings }] = await Promise.all([
    supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(200),
    supabase
      .from('user_settings')
      .select('lichess_username, chesscom_username, lichess_last_sync, chesscom_last_sync')
      .eq('user_id', user.id)
      .single(),
  ])

  const hasGames = games && games.length > 0
  const hasConnectedAccounts = settings?.lichess_username || settings?.chesscom_username

  return (
    <div className="space-y-6">
      {/* Auto-sync: bağlı hesaplar varsa arka planda çalışır */}
      {hasConnectedAccounts && (
        <AutoSync
          lichessUsername={settings?.lichess_username ?? null}
          chesscomUsername={settings?.chesscom_username ?? null}
          lichessLastSync={settings?.lichess_last_sync ?? null}
          chesscomLastSync={settings?.chesscom_last_sync ?? null}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Oyunlarım</h1>
          <p className="text-zinc-400 text-sm mt-1">{games?.length ?? 0} oyun arşivde</p>
        </div>
        <Link href="/games/upload">
          <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
            <Upload className="w-4 h-4" />
            Manuel Ekle
          </Button>
        </Link>
      </div>

      {!hasGames ? (
        <div className="text-center py-24 bg-zinc-900 rounded-2xl border border-zinc-800">
          <div className="text-6xl mb-4">♟️</div>
          <h2 className="text-white text-lg font-semibold mb-2">Henüz oyun yok</h2>
          <p className="text-zinc-400 text-sm mb-6">
            {hasConnectedAccounts
              ? 'Bağlı hesapların senkronize ediliyor...'
              : 'Ayarlar\'dan Lichess veya Chess.com hesabını bağla, ya da PGN yükle.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/settings">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
                Hesap Bağla
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
        <GamesTabs initialGames={games} />
      )}
    </div>
  )
}
