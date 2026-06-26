import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeGame, classifyLoss, detectPhase } from '@/lib/stockfish/engine'
import { Chess } from 'chess.js'

// Vercel Pro: 300s max. Free tier: 10s (analysis will timeout for long games on free)
export const maxDuration = 300

// 100 ms/position → 80 positions ≈ 8 s total (single process, no spawn overhead)
// Override with STOCKFISH_MOVETIME env var (e.g. 200 for deeper analysis)
const MOVETIME_MS = parseInt(process.env.STOCKFISH_MOVETIME ?? '100')

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: gameId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch game
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .eq('user_id', user.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  if (game.analysis_status === 'in_progress') {
    return NextResponse.json({ error: 'Analysis already running' }, { status: 409 })
  }

  // Mark as in progress
  await supabase
    .from('games')
    .update({ analysis_status: 'in_progress' })
    .eq('id', gameId)

  try {
    // Clean up previous analysis data (for re-analysis)
    await supabase.from('engine_analysis').delete().eq('game_id', gameId)

    const { data: oldMistakes } = await supabase
      .from('mistakes')
      .select('id')
      .eq('game_id', gameId)

    if (oldMistakes && oldMistakes.length > 0) {
      await supabase
        .from('study_items')
        .delete()
        .eq('reference_table', 'mistakes')
        .in('reference_id', oldMistakes.map(m => m.id))
      await supabase.from('mistakes').delete().eq('game_id', gameId)
    }

    // Fetch moves
    const { data: moves } = await supabase
      .from('moves')
      .select('*')
      .eq('game_id', gameId)
      .order('move_number')
      .order('color')

    if (!moves || moves.length === 0) {
      await supabase.from('games').update({ analysis_status: 'failed' }).eq('id', gameId)
      return NextResponse.json({ error: 'No moves found' }, { status: 400 })
    }

    // Build FEN list: fen_before for every move, plus the final fen_after.
    // analyzeGame runs a single Stockfish process for all positions — much faster.
    const fens = [
      ...moves.map(m => m.fen_before),
      moves[moves.length - 1].fen_after,
    ]
    const gameEvals = await analyzeGame(fens, MOVETIME_MS)

    const analysisResults: {
      move_id: string
      game_id: string
      eval_before: number
      eval_after: number
      best_move: string | null
      best_move_san: string | null
      centipawn_loss: number
      classification: string
      game_phase: string
      depth: number
      pv: string | null
      is_critical: boolean
    }[] = []

    // Compute centipawn loss for each move
    const mistakesToInsert: {
      user_id: string
      game_id: string
      move_id: string
      fen: string
      user_move: string
      best_move: string | null
      centipawn_loss: number
      severity: string
      game_phase: string
    }[] = []

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i]

      // eval_before: Stockfish eval from side-to-move perspective (higher = better for mover)
      const evalBefore = gameEvals[i]?.evalCp ?? 0

      // eval_after: Stockfish eval of next position, from opponent's (new side-to-move) perspective.
      // Negate to convert back to the moving player's frame of reference.
      const rawEvalAfter = gameEvals[i + 1]?.evalCp ?? 0
      const evalAfterFromPlayer = -rawEvalAfter

      // How much worse off the player is vs the best available continuation
      const cpLoss = Math.max(0, evalBefore - evalAfterFromPlayer)

      const phase = detectPhase(move.move_number, move.fen_before)
      const classification = classifyLoss(cpLoss)
      const isCritical = cpLoss >= 100

      // Convert best_move UCI to SAN
      let bestMoveSan: string | null = null
      const bestMoveUci = gameEvals[i]?.bestMove ?? null
      if (bestMoveUci && bestMoveUci !== move.uci) {
        try {
          const chess = new Chess(move.fen_before)
          const from = bestMoveUci.slice(0, 2)
          const to = bestMoveUci.slice(2, 4)
          const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined
          const m = chess.move({ from, to, promotion })
          if (m) bestMoveSan = m.san
        } catch { /* skip */ }
      }

      analysisResults.push({
        move_id: move.id,
        game_id: gameId,
        eval_before: evalBefore,
        eval_after: rawEvalAfter,
        best_move: bestMoveUci,
        best_move_san: bestMoveSan,
        centipawn_loss: Math.round(cpLoss),
        classification,
        game_phase: phase,
        depth: MOVETIME_MS,
        pv: gameEvals[i]?.pv ?? null,
        is_critical: isCritical,
      })

      if (classification === 'mistake' || classification === 'blunder') {
        mistakesToInsert.push({
          user_id: user.id,
          game_id: gameId,
          move_id: move.id,
          fen: move.fen_before,
          user_move: move.san,
          best_move: bestMoveSan ?? bestMoveUci,
          centipawn_loss: Math.round(cpLoss),
          severity: classification === 'blunder' ? 'blunder' : 'mistake',
          game_phase: phase,
        })
      }
    }

    // Save engine_analysis (batch insert in chunks of 50)
    const CHUNK = 50
    for (let i = 0; i < analysisResults.length; i += CHUNK) {
      await supabase.from('engine_analysis').insert(analysisResults.slice(i, i + CHUNK))
    }

    // Save mistakes
    const insertedMistakes: { id: string; severity: string; game_phase: string; centipawn_loss: number }[] = []
    if (mistakesToInsert.length > 0) {
      const { data: inserted } = await supabase
        .from('mistakes')
        .insert(mistakesToInsert)
        .select('id, severity, game_phase, centipawn_loss')
      if (inserted) insertedMistakes.push(...inserted)
    }

    // Create study items for mistakes/blunders
    if (insertedMistakes.length > 0) {
      const studyItems = insertedMistakes.map(m => ({
        user_id: user.id,
        type: 'mistake',
        reference_id: m.id,
        reference_table: 'mistakes',
        title: `${m.severity === 'blunder' ? '?? Blunder' : '? Hata'} — ${game.opponent ?? 'Bilinmiyor'} oyununda`,
        description: `${m.game_phase} fazında ${m.centipawn_loss} cp kayıp`,
        priority_score: m.severity === 'blunder' ? 80 : 60,
        due_at: new Date().toISOString(),
      }))
      await supabase.from('study_items').insert(studyItems)
    }

    // Compute and save weakness scores
    await computeAndSaveWeaknessScores(supabase, user.id, analysisResults, mistakesToInsert)

    // Mark game as completed
    await supabase
      .from('games')
      .update({ analysis_status: 'completed' })
      .eq('id', gameId)

    return NextResponse.json({
      success: true,
      movesAnalyzed: analysisResults.length,
      mistakes: mistakesToInsert.filter(m => m.severity === 'mistake').length,
      blunders: mistakesToInsert.filter(m => m.severity === 'blunder').length,
    })
  } catch (error) {
    console.error('Analysis error:', error)
    await supabase.from('games').update({ analysis_status: 'failed' }).eq('id', gameId)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

async function computeAndSaveWeaknessScores(
  supabase: ReturnType<Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>['from']> extends never ? never : any,
  userId: string,
  analysisResults: { game_phase: string; centipawn_loss: number; classification: string }[],
  mistakes: { severity: string; game_phase: string }[]
) {
  const total = analysisResults.length
  if (total === 0) return

  const blunders = mistakes.filter(m => m.severity === 'blunder').length
  const mistakeCount = mistakes.filter(m => m.severity === 'mistake').length

  const openingMoves = analysisResults.filter(a => a.game_phase === 'opening')
  const middleMoves = analysisResults.filter(a => a.game_phase === 'middlegame')
  const endgameMoves = analysisResults.filter(a => a.game_phase === 'endgame')

  const avgCpLoss = (arr: typeof analysisResults) =>
    arr.length ? arr.reduce((s, a) => s + a.centipawn_loss, 0) / arr.length : 0

  // Score formula: 100 - (avg_cp_loss / 2) clamped to 0-100
  const cpToScore = (cp: number) => Math.max(0, Math.min(100, Math.round(100 - cp / 2)))

  const scores = [
    { area: 'tactical_awareness', score: cpToScore(avgCpLoss(middleMoves) + blunders * 10) },
    { area: 'opening_confidence', score: cpToScore(avgCpLoss(openingMoves)) },
    { area: 'endgame_technique', score: cpToScore(avgCpLoss(endgameMoves)) },
    { area: 'planning', score: cpToScore(avgCpLoss(middleMoves)) },
    { area: 'calculation', score: cpToScore(blunders * 25 + mistakeCount * 10) },
  ]

  for (const { area, score } of scores) {
    await supabase
      .from('weakness_scores')
      .upsert({ user_id: userId, area, score, computed_at: new Date().toISOString() }, {
        onConflict: 'user_id,area',
      })
  }
}
