import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePGN, extractMoves } from '@/lib/chess/utils'

export const maxDuration = 60

function splitPGNs(raw: string): string[] {
  const games: string[] = []
  const parts = raw.split(/\n\n(?=\[Event)/)
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith('[')) games.push(trimmed)
  }
  return games
}

async function fetchLichess(username: string, since?: Date): Promise<string[]> {
  let url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?clocks=false&evals=false`
  // since parametresi varsa sadece yeni oyunları çek, yoksa tüm oyunları al
  if (since) url += `&since=${since.getTime()}`

  const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Lichess kullanıcı bulunamadı')
    throw new Error(`Lichess API hatası: ${res.status}`)
  }
  return splitPGNs(await res.text())
}

async function fetchChessCom(username: string, since?: Date): Promise<string[]> {
  const archivesRes = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`,
    { headers: { 'User-Agent': 'ChessLab/1.0' } }
  )
  if (!archivesRes.ok) {
    if (archivesRes.status === 404) throw new Error('Chess.com kullanıcı bulunamadı')
    throw new Error(`Chess.com API hatası: ${archivesRes.status}`)
  }
  const { archives } = (await archivesRes.json()) as { archives: string[] }
  if (!archives?.length) return []

  // since varsa, o tarihten önceki arşivleri atla
  const sinceYear = since ? since.getFullYear() : 0
  const sinceMonth = since ? since.getMonth() + 1 : 0
  const sinceTs = since ? Math.floor(since.getTime() / 1000) : 0

  const pgns: string[] = []

  for (const archiveUrl of archives.reverse()) {
    // URL formatı: .../games/2024/03 → yıl ve ay filtresi
    const match = archiveUrl.match(/\/(\d{4})\/(\d{2})$/)
    if (match && since) {
      const year = parseInt(match[1])
      const month = parseInt(match[2])
      if (year < sinceYear || (year === sinceYear && month < sinceMonth)) continue
    }

    const monthRes = await fetch(archiveUrl, { headers: { 'User-Agent': 'ChessLab/1.0' } })
    if (!monthRes.ok) continue
    const data = (await monthRes.json()) as { games: { pgn?: string; end_time?: number }[] }

    for (const game of (data.games ?? []).reverse()) {
      if (!game.pgn) continue
      // since kontrolü: end_time timestamp ile karşılaştır
      if (sinceTs && game.end_time && game.end_time <= sinceTs) continue
      pgns.push(game.pgn)
    }
  }

  return pgns
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { platform: 'lichess' | 'chesscom' }
  const { platform } = body

  // Kullanıcı ayarlarından bağlı hesap bilgilerini al
  const { data: settings } = await supabase
    .from('user_settings')
    .select('lichess_username, chesscom_username, lichess_last_sync, chesscom_last_sync')
    .eq('user_id', user.id)
    .single()

  const username = platform === 'lichess' ? settings?.lichess_username : settings?.chesscom_username
  if (!username) return NextResponse.json({ error: 'Bu platform için hesap bağlı değil' }, { status: 400 })

  const lastSyncStr = platform === 'lichess' ? settings?.lichess_last_sync : settings?.chesscom_last_sync
  const lastSync = lastSyncStr ? new Date(lastSyncStr) : undefined

  let rawPgns: string[] = []
  try {
    if (platform === 'lichess') rawPgns = await fetchLichess(username, lastSync)
    else rawPgns = await fetchChessCom(username, lastSync)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }

  if (rawPgns.length === 0) {
    // Sync zamanını yine de güncelle
    await supabase.from('user_settings').update({
      [`${platform}_last_sync`]: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)
    return NextResponse.json({ imported: 0, skipped: 0 })
  }

  // Mevcut played_at değerlerini tek sorguda al (deduplication için)
  const { data: existingGames } = await supabase
    .from('games')
    .select('played_at')
    .eq('user_id', user.id)

  const existingDates = new Set((existingGames ?? []).map(g => g.played_at).filter(Boolean))

  let imported = 0
  let skipped = 0
  const allMoves: Array<ReturnType<typeof extractMoves>[0] & { game_id: string }> = []

  for (const pgn of rawPgns) {
    const parsed = parsePGN(pgn, username)
    if (!parsed) { skipped++; continue }

    if (parsed.played_at && existingDates.has(parsed.played_at)) { skipped++; continue }

    const { data: game, error } = await supabase
      .from('games')
      .insert({
        user_id: user.id,
        pgn,
        platform: platform === 'lichess' ? 'lichess' : 'chess.com',
        opponent: parsed.opponent,
        played_at: parsed.played_at,
        time_control: parsed.time_control,
        user_color: parsed.user_color,
        result: parsed.result,
        opening_name: parsed.opening_name,
        eco_code: parsed.eco_code,
        total_moves: parsed.total_moves,
        analysis_status: 'pending',
      })
      .select('id')
      .single()

    if (error || !game) { skipped++; continue }

    if (parsed.played_at) existingDates.add(parsed.played_at)

    const moves = extractMoves(pgn).map(m => ({ ...m, game_id: game.id }))
    allMoves.push(...moves)
    imported++
  }

  // Hamleleri toplu ekle (500'lük parçalar halinde)
  const CHUNK = 500
  for (let i = 0; i < allMoves.length; i += CHUNK) {
    await supabase.from('moves').insert(allMoves.slice(i, i + CHUNK))
  }

  // Son sync zamanını güncelle
  await supabase.from('user_settings').update({
    [`${platform}_last_sync`]: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id)

  return NextResponse.json({ imported, skipped })
}
