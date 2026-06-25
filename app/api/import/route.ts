import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePGN, extractMoves } from '@/lib/chess/utils'

export const maxDuration = 60

function splitPGNs(raw: string): string[] {
  const games: string[] = []
  // Her oyun [Event ile başlar, bir sonraki [Event ile ayrılır
  const parts = raw.split(/\n\n(?=\[Event)/)
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith('[')) games.push(trimmed)
  }
  return games
}

async function fetchLichess(username: string, max: number): Promise<string[]> {
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${max}&clocks=false&evals=false`
  const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Lichess kullanıcı bulunamadı')
    throw new Error(`Lichess API hatası: ${res.status}`)
  }
  return splitPGNs(await res.text())
}

async function fetchChessCom(username: string, max: number): Promise<string[]> {
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

  const pgns: string[] = []
  // En yeni aydan geriye giderek max oyun toplanır
  for (let i = archives.length - 1; i >= 0 && pgns.length < max; i--) {
    const monthRes = await fetch(archives[i], { headers: { 'User-Agent': 'ChessLab/1.0' } })
    if (!monthRes.ok) continue
    const data = (await monthRes.json()) as { games: { pgn?: string }[] }
    const monthPgns = (data.games ?? [])
      .map(g => g.pgn ?? '')
      .filter(Boolean)
      .reverse() // içinde en yeni önce
    pgns.push(...monthPgns)
  }

  return pgns.slice(0, max)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { platform: string; username: string; max?: number }
  const { platform, username, max = 20 } = body

  if (!platform || !username?.trim()) {
    return NextResponse.json({ error: 'platform ve username gerekli' }, { status: 400 })
  }

  let rawPgns: string[] = []
  try {
    if (platform === 'lichess') rawPgns = await fetchLichess(username.trim(), max)
    else if (platform === 'chesscom') rawPgns = await fetchChessCom(username.trim(), max)
    else return NextResponse.json({ error: 'Geçersiz platform' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }

  if (rawPgns.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 })
  }

  let imported = 0
  let skipped = 0

  for (const pgn of rawPgns) {
    const parsed = parsePGN(pgn, username.trim())
    if (!parsed) { skipped++; continue }

    // Aynı tarih + aynı rakiple oyun varsa atla
    if (parsed.played_at) {
      const { data: existing } = await supabase
        .from('games')
        .select('id')
        .eq('user_id', user.id)
        .eq('played_at', parsed.played_at)
        .limit(1)
      if (existing && existing.length > 0) { skipped++; continue }
    }

    const { data: game, error: gameError } = await supabase
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
      .select()
      .single()

    if (gameError || !game) { skipped++; continue }

    const moves = extractMoves(pgn).map(m => ({ ...m, game_id: game.id }))
    if (moves.length > 0) {
      await supabase.from('moves').insert(moves)
    }

    imported++
  }

  return NextResponse.json({ imported, skipped })
}
