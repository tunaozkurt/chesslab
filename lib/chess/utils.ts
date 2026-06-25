import { Chess } from 'chess.js'
import { ParsedGame, GameResult, UserColor, MoveClassification } from '@/types'

export function formatDistanceToNow(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Bugün'
  if (days === 1) return 'Dün'
  if (days < 7) return `${days} gün önce`
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`
  return `${Math.floor(days / 30)} ay önce`
}

export function parsePGN(pgn: string, userEmail?: string): ParsedGame | null {
  try {
    const chess = new Chess()
    chess.loadPgn(pgn)
    const headers = chess.header()
    const history = chess.history({ verbose: true })

    const whitePlayer = headers['White'] ?? ''
    const blackPlayer = headers['Black'] ?? ''
    const resultStr = headers['Result'] ?? ''

    let userColor: UserColor | null = null
    let opponent: string | null = null

    if (userEmail) {
      const userLower = userEmail.toLowerCase()
      if (whitePlayer.toLowerCase() === userLower || whitePlayer.toLowerCase().includes(userLower)) {
        userColor = 'white'
        opponent = blackPlayer || null
      } else if (blackPlayer.toLowerCase() === userLower || blackPlayer.toLowerCase().includes(userLower)) {
        userColor = 'black'
        opponent = whitePlayer || null
      }
    }

    let result: GameResult | null = null
    if (userColor) {
      if (resultStr === '1-0') result = userColor === 'white' ? 'win' : 'loss'
      else if (resultStr === '0-1') result = userColor === 'black' ? 'win' : 'loss'
      else if (resultStr === '1/2-1/2') result = 'draw'
    } else {
      if (resultStr === '1/2-1/2') result = 'draw'
    }

    // UTCDate + UTCTime (Lichess ve Chess.com her ikisinde de var) → kesin timestamp
    const utcDate = headers['UTCDate'] ?? headers['Date']
    const utcTime = headers['UTCTime'] ?? headers['StartTime']
    let played_at: string | null = null
    if (utcDate && utcDate !== '????.??.??') {
      const cleanDate = utcDate.replace(/\?/g, '01').replace(/\./g, '-')
      const dateTimeStr = utcTime ? `${cleanDate}T${utcTime}Z` : cleanDate
      const date = new Date(dateTimeStr)
      if (!isNaN(date.getTime())) played_at = date.toISOString()
    }

    const timeControl = headers['TimeControl'] ?? null
    const eco = headers['ECO'] ?? null
    const opening = headers['Opening'] ?? null

    return {
      pgn,
      opponent,
      played_at,
      platform: null,
      time_control: timeControl,
      user_color: userColor,
      result,
      opening_name: opening,
      eco_code: eco,
      total_moves: history.length,
    }
  } catch {
    return null
  }
}

export function extractMoves(pgn: string) {
  const chess = new Chess()
  chess.loadPgn(pgn)
  const history = chess.history({ verbose: true })

  const moves = []
  const tempChess = new Chess()

  for (const move of history) {
    const fenBefore = tempChess.fen()
    tempChess.move(move.san)
    const fenAfter = tempChess.fen()

    moves.push({
      move_number: Math.ceil(moves.length / 2) + 1,
      color: move.color === 'w' ? 'white' : 'black',
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ''),
      fen_before: fenBefore,
      fen_after: fenAfter,
    })
  }

  return moves
}

export function detectGamePhase(moveNumber: number, fen: string): 'opening' | 'middlegame' | 'endgame' {
  if (moveNumber <= 15) return 'opening'

  const chess = new Chess(fen)
  const board = chess.board()
  let pieceCount = 0
  let hasQueens = false

  for (const row of board) {
    for (const piece of row) {
      if (piece) {
        pieceCount++
        if (piece.type === 'q') hasQueens = true
      }
    }
  }

  if (!hasQueens || pieceCount <= 10) return 'endgame'
  return 'middlegame'
}

export function classifyMove(centipawnLoss: number): MoveClassification {
  if (centipawnLoss < 10) return 'best'
  if (centipawnLoss < 25) return 'excellent'
  if (centipawnLoss < 50) return 'inaccuracy'
  if (centipawnLoss < 100) return 'mistake'
  return 'blunder'
}

export function evalToString(eval_: number | null, color: 'white' | 'black'): string {
  if (eval_ === null) return '0.0'
  const fromWhite = color === 'white' ? eval_ : -eval_
  if (Math.abs(fromWhite) >= 1000) {
    return fromWhite > 0 ? 'M+' : 'M-'
  }
  return (fromWhite / 100).toFixed(1)
}

export function classificationColor(cls: MoveClassification | null): string {
  const map: Record<MoveClassification, string> = {
    best: 'text-cyan-400',
    excellent: 'text-emerald-400',
    good: 'text-green-400',
    inaccuracy: 'text-yellow-400',
    mistake: 'text-orange-400',
    blunder: 'text-red-500',
    miss: 'text-red-400',
  }
  return cls ? map[cls] : 'text-zinc-400'
}

export function classificationLabel(cls: MoveClassification | null): string {
  const map: Record<MoveClassification, string> = {
    best: 'En iyi',
    excellent: 'Mükemmel',
    good: 'İyi',
    inaccuracy: 'Hata (küçük)',
    mistake: 'Hata',
    blunder: 'Çok büyük hata',
    miss: 'Kaçırıldı',
  }
  return cls ? map[cls] : ''
}

export function classificationIcon(cls: MoveClassification | null): string {
  const map: Record<MoveClassification, string> = {
    best: '✓✓',
    excellent: '✓',
    good: '·',
    inaccuracy: '?!',
    mistake: '?',
    blunder: '??',
    miss: '□',
  }
  return cls ? map[cls] : ''
}
