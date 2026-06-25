import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePGN, extractMoves } from '@/lib/chess/utils'

export const maxDuration = 60

function splitPGNs(raw: string): string[] {
  const games: string[] = []
  const parts = raw.split(/\r?\n\r?\n(?=\[Event)/)
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith('[')) games.push(trimmed)
  }
  return games
}

async function fetchLichess(username: string, since?: Date): Promise<string[]> {
  // İlk sync: 50, sonraki: 200 (Vercel free tier 10s timeout'a uygun)
  const max = since ? 200 : 50
  let url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?clocks=false&evals=false&max=${max}`
  if (since) url += `&since=${since.getTime()}`

  const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Lichess kullanıcı bulunamadı')
    if (res.status === 429) throw new Error('Lichess istek limiti aşıldı, birkaç dakika bekleyip tekrar dene')
    throw new Error(`Lichess API hatası: ${res.status}`)
  }
  const text = await res.text()
  if (!text.trim()) return []
  return splitPGNs(text)
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

  const sinceYear = since ? since.getFullYear() : 0
  const sinceMonth = since ? since.getMonth() + 1 : 0
  const sinceTs = since ? Math.floor(since.getTime() / 1000) : 0

  const pgns: string[] = []

  for (const archiveUrl of archives.reverse()) {
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
      if (sinceTs && game.end_time && game.end_time <= sinceTs) continue
      pgns.push(game.pgn)
    }

    if (!since && pgns.length >= 50) break // ilk sync'te yeterli
  }

  return pgns.slice(0, since ? 200 : 50)
}

// DELETE /api/sync?platform=lichess → last_sync sıfırla
export async function DELETE(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get('platform')
  if (!platform) return NextResponse.json({ error: 'platform gerekli' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const field = platform === 'lichess' ? 'lichess_last_sync' : 'chesscom_last_sync'
  await supabase
    .from('user_settings')
    .update({ [field]: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { platform: 'lichess' | 'chesscom'; force?: boolean }
  const { platform, force = false } = body

  const { data: settings } = await supabase
    .from('user_settings')
    .select('lichess_username, chesscom_username, lichess_last_sync, chesscom_last_sync')
    .eq('user_id', user.id)
    .single()

  const username = platform === 'lichess' ? settings?.lichess_username : settings?.chesscom_username
  if (!username) return NextResponse.json({ error: 'Bu platform için hesap bağlı değil' }, { status: 400 })

  const { count: gameCount } = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('platform', platform === 'lichess' ? 'lichess' : 'chess.com')

  const lastSyncStr = platform === 'lichess' ? settings?.lichess_last_sync : settings?.chesscom_last_sync
  const lastSync = (!force && (gameCount ?? 0) > 0 && lastSyncStr)
    ? new Date(lastSyncStr)
    : undefined

  let rawPgns: string[] = []
  try {
    if (platform === 'lichess') rawPgns = await fetchLichess(username, lastSync)
    else rawPgns = await fetchChessCom(username, lastSync)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }

  if (rawPgns.length === 0) {
    await supabase.from('user_settings').update({
      [`${platform}_last_sync`]: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)
    return NextResponse.json({ imported: 0, skipped: 0, total: 0, gameCount: gameCount ?? 0 })
  }

  // Mevcut oyunların played_at+opponent setini al (dedup için)
  const { data: existingGames } = await supabase
    .from('games')
    .select('played_at, opponent')
    .eq('user_id', user.id)
    .eq('platform', platform === 'lichess' ? 'lichess' : 'chess.com')

  const existingKeys = new Set(
    (existingGames ?? [])
      .filter(g => g.played_at)
      .map(g => `${g.played_at}|${(g.opponent ?? '').toLowerCase()}`)
  )

  // Tüm PGN'leri parse et, yenileri filtrele
  type ParsedEntry = { pgn: string; data: ReturnType<typeof parsePGN> & {} }
  const toInsert: { pgn: string; parsed: NonNullable<ReturnType<typeof parsePGN>> }[] = []
  let parseFailures = 0

  for (const pgn of rawPgns) {
    const parsed = parsePGN(pgn, username)
    if (!parsed) { parseFailures++; continue }
    const key = `${parsed.played_at ?? ''}|${(parsed.opponent ?? '').toLowerCase()}`
    if (parsed.played_at && existingKeys.has(key)) continue
    toInsert.push({ pgn, parsed })
  }

  if (toInsert.length === 0) {
    await supabase.from('user_settings').update({
      [`${platform}_last_sync`]: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)
    return NextResponse.json({
      imported: 0,
      skipped: rawPgns.length - parseFailures,
      total: rawPgns.length,
      parseFailures,
      gameCount: gameCount ?? 0,
    })
  }

  // Toplu insert — tek sorguda tüm oyunları ekle
  const platformStr = platform === 'lichess' ? 'lichess' : 'chess.com'
  const gamesData = toInsert.map(({ pgn, parsed }) => ({
    user_id: user.id,
    pgn,
    platform: platformStr,
    opponent: parsed.opponent,
    played_at: parsed.played_at,
    time_control: parsed.time_control,
    user_color: parsed.user_color,
    result: parsed.result,
    opening_name: parsed.opening_name,
    eco_code: parsed.eco_code,
    total_moves: parsed.total_moves,
    analysis_status: 'pending',
  }))

  const { data: insertedGames, error: insertError } = await supabase
    .from('games')
    .insert(gamesData)
    .select('id')

  if (insertError || !insertedGames) {
    return NextResponse.json({ error: insertError?.message ?? 'Insert hatası' }, { status: 500 })
  }

  // Hamleleri toplu extract et ve toplu insert yap
  const allMoves: object[] = []
  for (let i = 0; i < insertedGames.length; i++) {
    const moves = extractMoves(toInsert[i].pgn).map(m => ({ ...m, game_id: insertedGames[i].id }))
    allMoves.push(...moves)
  }

  const CHUNK = 500
  for (let i = 0; i < allMoves.length; i += CHUNK) {
    await supabase.from('moves').insert(allMoves.slice(i, i + CHUNK))
  }

  await supabase.from('user_settings').update({
    [`${platform}_last_sync`]: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id)

  return NextResponse.json({
    imported: insertedGames.length,
    skipped: rawPgns.length - toInsert.length - parseFailures,
    total: rawPgns.length,
    parseFailures,
    gameCount: gameCount ?? 0,
  })
}
